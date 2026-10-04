"""Simplify source lighting into large polygonal cel fills, without gradients."""
import numpy as np
import math
from PIL import Image, ImageDraw, ImageFilter


def simplify(points, tolerance):
    """Ramer-Douglas-Peucker simplification of a boundary segment."""
    if len(points) < 3:
        return points
    a, b = np.array(points[0]), np.array(points[-1])
    delta = b-a
    distances = [abs(delta[0]*(p[1]-a[1])-delta[1]*(p[0]-a[0]))/max(1, np.linalg.norm(delta)) for p in points[1:-1]]
    index = int(np.argmax(distances))+1
    if distances[index-1] <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:index+1], tolerance)[:-1]+simplify(points[index:], tolerance)


def boundaries(mask):
    """Trace directed cell edges, retaining outer contours and interior holes."""
    edges = {}
    height, width = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        for exposed, a, b in [
            (y==0 or not mask[y-1,x],(x,y),(x+1,y)),
            (x==width-1 or not mask[y,x+1],(x+1,y),(x+1,y+1)),
            (y==height-1 or not mask[y+1,x],(x+1,y+1),(x,y+1)),
            (x==0 or not mask[y,x-1],(x,y+1),(x,y))]:
            if exposed:
                edges.setdefault(a,set()).add(b)
    paths=[]
    while edges:
        start=next(iter(edges));point=start;previous=(start[0]-1,start[1]);path=[start]
        while True:
            dx,dy=point[0]-previous[0],point[1]-previous[1]
            def turn(candidate):
                vx,vy=candidate[0]-point[0],candidate[1]-point[1]
                return {(1,0):3,(0,1):2,(-1,0):1,(0,-1):0}[(dx*vy-dy*vx,dx*vx+dy*vy)]
            following=max(edges[point],key=turn)
            edges[point].remove(following)
            if not edges[point]:del edges[point]
            previous,point=point,following
            if point==start:break
            path.append(point)
        paths.append(path)
    return paths


def cel_shading(luminance, reference, alpha, paint_region, ink_alpha, settings):
    width=settings.get('shapeGridWidth',256)
    if type(width) is not int or not 128<=width<=512:
        raise ValueError('shapeGridWidth must be an integer between 128 and 512')
    tolerance=settings.get('shapeToleranceCells',1.25)
    minimum=settings.get('minimumShapeCells',18)
    if not isinstance(tolerance,(int,float)) or not math.isfinite(tolerance) or not 0<=tolerance<=5:
        raise ValueError('shapeToleranceCells must be between 0 and 5')
    if type(minimum) is not int or not 1<=minimum<=256:
        raise ValueError('minimumShapeCells must be an integer between 1 and 256')
    height=max(1,round(luminance.shape[0]*width/luminance.shape[1]))
    # Averaging only selects broad source-lit regions. It is never rendered as
    # a blurred texture: traced/simplified polygons receive constant alpha.
    clean=np.where(alpha>=128,luminance,reference)
    small=Image.fromarray(np.clip(clean,0,255).astype(np.uint8)).resize((width,height),Image.Resampling.BOX).filter(ImageFilter.MedianFilter(5))
    ratio=np.asarray(small).astype(np.float32)/max(1,reference)
    classes=np.select([ratio<.45,ratio<.86,ratio>1.35],[1,2,3],default=0)
    shade=np.zeros((*alpha.shape,4),dtype=np.uint8)
    scale_x=alpha.shape[1]/width;scale_y=alpha.shape[0]/height
    for code,value,rgb in [(1,140,0),(2,72,0),(3,56,255)]:
        mask=Image.new('L',(alpha.shape[1],alpha.shape[0]));draw=ImageDraw.Draw(mask)
        contours=[]
        for path in boundaries(classes==code):
            area=sum(path[i][0]*path[(i+1)%len(path)][1]-path[(i+1)%len(path)][0]*path[i][1] for i in range(len(path)))/2
            if abs(area)<minimum:continue
            # Split a closed loop at its furthest point before simplifying, so
            # the algorithm never treats the entire loop as a zero-length line.
            split=max(range(len(path)),key=lambda i:(path[i][0]-path[0][0])**2+(path[i][1]-path[0][1])**2)
            polygon=simplify(path[:split+1],tolerance)[:-1]+simplify(path[split:]+[path[0]],tolerance)[:-1]
            if len(polygon)>=3:contours.append((area,polygon))
        for area,polygon in sorted(contours,key=lambda p:abs(p[0]),reverse=True):
            draw.polygon([(round(x*scale_x),round(y*scale_y)) for x,y in polygon],fill=255 if area>0 else 0)
        selected=np.asarray(mask)>0
        shade[selected,:3]=rgb;shade[selected,3]=value
    shade[:,:,3]=np.where(paint_region&(ink_alpha==0),shade[:,:,3],0)
    shade[:,:,3]=(shade[:,:,3].astype(np.uint16)*alpha//255).astype(np.uint8)
    return shade
