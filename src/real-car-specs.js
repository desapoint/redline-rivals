// Derived from the archived manufacturer research. Unknown factory facts remain null.
export const REAL_CAR_SPECS = {
  "mazda3-gt-turbo-sedan-2021-red": {
    "manufacturerReference": {
      "year": 2021,
      "make": "Mazda",
      "model": "Mazda3",
      "trim": "GT Turbo",
      "market": "Canada",
      "body": "4-door sedan",
      "requestedPaint": "Soul Red Crystal Metallic (verified factory name; official digital swatch RGB/hex not sampled)",
      "engine": {
        "displacementL": 2.5,
        "layout": "inline",
        "cylinders": 4,
        "aspiration": "turbocharged",
        "fuelType": "gasoline"
      },
      "power": [
        {
          "fuel": "93 octane",
          "hp": 250,
          "rpm": 5000
        },
        {
          "fuel": "87 octane",
          "hp": 227,
          "rpm": 5000
        }
      ],
      "torque": [
        {
          "fuel": "93 octane",
          "lbFt": 320,
          "rpm": 2500
        },
        {
          "fuel": "87 octane",
          "lbFt": 310,
          "rpm": 2000
        }
      ],
      "redlineRpm": 6300,
      "curbMassKg": 1533,
      "drivetrain": "AWD (i-Activ)",
      "transmission": {
        "type": "6-speed automatic",
        "gears": 6,
        "ratios": [
          3.487,
          1.992,
          1.449,
          1,
          0.707,
          0.6
        ],
        "finalDrive": 3.583
      },
      "tireSize": "215/45R18",
      "wheelbaseMm": 2726,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "notes": [
        "2021 Canadian GT Turbo sedan; not Mazda3 Sport hatchback.",
        "Mazda Canada confirms fuel-dependent ratings, AWD and 6-speed automatic.",
        "Gloss-black mirror caps and gloss-black 18-inch alloy wheels are supported by Mazda Canada Turbo trim description.",
        "Default Mazda art is Soul Red Crystal Metallic by verified factory name. The rendered paint is an illustrative visual approximation until a swatch can be sampled from the official page.",
        "Paint codes are not stated in the cited 2021 Canadian Mazda3 color guide; null is intentional.",
        "Canadian GT Turbo is AWD/6AT; manufacturer color page names Soul Red Crystal Metallic as an available Mazda3 sedan color. Pixel-level digital color match remains pending.",
        "Canadian GT Turbo is AWD/6AT; manufacturer color page names Soul Red Crystal Metallic as an available Mazda3 sedan color. Pixel-level digital color match remains pending."
      ],
      "sourceFieldMap": [
        {
          "url": "https://en.media.mazda.ca/2020-07-09-2021-Mazda3-And-Mazda3-Sport-Powertrain-Choice-for-Every-Lifestyle",
          "fields": [
            "2021 Canadian Mazda3 sedan GT Turbo/2.5T powertrain offering",
            "AWD and 6-speed automatic"
          ]
        },
        {
          "url": "https://en.media.mazda.ca/2020-07-08-2021-Mazda3-Turbo-Refined-Performance",
          "fields": [
            "Turbo model rating and appearance claims; no curb weight or body dimensions asserted"
          ]
        },
        {
          "url": "https://filecache.mediaroom.com/mr5mr_mazdaca/218820/download/2021%20Mazda3%20Specifications%20%26%20Features.pdf",
          "fields": [
            "93/87 octane horsepower and torque with RPM",
            "redline",
            "2021 sedan color/trim list",
            "GT Turbo chrome lower bumper inlet decoration, enlarged exhaust outlets, Jet Black Mica mirrors, black wheels",
            "curb mass, tire size, AWD gear ratios/final drive and wheelbase"
          ]
        }
      ],
      "unknownFieldsExplicitlyNull": true,
      "paintCode": null
    },
    "gameplayModel": {
      "status": "provisional balancing data; not measured dyno data",
      "torqueCurve": {
        "rpm": [
          1000,
          1800,
          2500,
          3500,
          4500,
          5000,
          6000
        ],
        "lbFt": [
          175,
          260,
          320,
          320,
          285,
          262.6,
          210
        ],
        "source": "estimated torque points for a gameplay model; not measured dyno data"
      },
      "powerDerivedFromTorque": true,
      "drivetrainLossFraction": null,
      "gearRatios": [
        3.487,
        1.992,
        1.449,
        1,
        0.707,
        0.6
      ],
      "shiftInterruptionMs": null,
      "clutchTorqueCapacityNm": null,
      "weightDistribution": null,
      "tireGrip": null,
      "tirePressureKPa": null,
      "temperatureModel": null,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "upgradePotential": null,
      "reliability": null,
      "performanceClass": null,
      "performancePoints": null,
      "selectedFuelProfile": "93 octane premium",
      "powerCurveDerivedFromTorque": [
        {
          "rpm": 1000,
          "hp": 33.32
        },
        {
          "rpm": 1500,
          "hp": 65.15
        },
        {
          "rpm": 2000,
          "hp": 105.54
        },
        {
          "rpm": 2500,
          "hp": 152.32
        },
        {
          "rpm": 3000,
          "hp": 182.79
        },
        {
          "rpm": 3500,
          "hp": 213.25
        },
        {
          "rpm": 4000,
          "hp": 230.39
        },
        {
          "rpm": 4500,
          "hp": 244.19
        },
        {
          "rpm": 5000,
          "hp": 250
        },
        {
          "rpm": 5500,
          "hp": 247.46
        },
        {
          "rpm": 6000,
          "hp": 239.91
        }
      ],
      "expectedPeakHorsepowerHp": 250,
      "interpolatedPeakHorsepowerHp": 250,
      "notes": [
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve.",
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve."
      ]
    }
  },
  "chevrolet-silverado-1500-custom-crew-short-2025-black": {
    "manufacturerReference": {
      "year": 2025,
      "make": "Chevrolet",
      "model": "Silverado 1500",
      "trim": "Custom",
      "market": "United States for 2025 model specifications and color list",
      "body": "Crew Cab, Short Bed, standard height",
      "requestedPaint": "Black (verified factory name; official digital swatch RGB/hex not sampled)",
      "engine": {
        "displacementL": 2.7,
        "layout": "inline",
        "cylinders": 4,
        "aspiration": "turbocharged (TurboMax)",
        "fuelType": "gasoline"
      },
      "power": [
        {
          "hp": 310,
          "rpm": 5600
        }
      ],
      "torque": [
        {
          "lbFt": 430,
          "rpm": null
        }
      ],
      "redlineRpm": null,
      "curbMassKg": null,
      "drivetrain": "4WD (provisional assumption; not specified by user)",
      "transmission": {
        "type": "8-speed automatic",
        "gears": 8,
        "ratios": null,
        "finalDrive": null
      },
      "tireSize": null,
      "wheelbaseMm": 3734,
      "bedLengthMm": 1776,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "notes": [
        "Silverado 1500 is interpretation of \u201cChevrolet Custom.\u201d",
        "Crew Cab with four full doors and Short Bed, not Double Cab.",
        "Standard-height Custom, not Custom Trail Boss.",
        "TurboMax is 2.7L turbo inline-four; no V8 is represented.",
        "4WD is provisional because drive was not specified. 2025 GM geometry was not populated because exact trim/config-specific dimensions were not established in the reviewed source set.",
        "Default black uses the factory color name Black. Exact Custom trim paint-code pairing and digital swatch sampling are not established here.",
        "The listed palette is model-wide; trim-specific availability must be checked against a Custom order guide.",
        "Crew Cab Short Bed is 147-inch wheelbase and 1,776 mm box length per 2025 GM configuration references.",
        "Crew Cab Short Bed is 147-inch wheelbase and 1,776 mm box length per 2025 GM configuration references."
      ],
      "sourceFieldMap": [
        {
          "url": "https://www.gmenvolve.com/content/dam/gmenvolve/na/us/en/index/pdfs/trucks/02-pdfs/25GMFG_DECEMBER_FeaturePages_Chevrolet_Silverado1500.pdf",
          "fields": [
            "2025 Silverado Custom availability with 2WD/4WD",
            "TurboMax 310 hp/430 lb-ft, standard 8-speed automatic",
            "model-wide color names with trim availability caveat"
          ]
        },
        {
          "url": "https://www.gmenvolve.com/content/dam/gmenvolve/na/us/en/index/pdfs/guides-and-manuals/02-pdfs/25GMFG-DECEMBER.pdf",
          "fields": [
            "Crew Cab Short Bed nominal 5 ft 8 in box and 147 in wheelbase configuration dimensions; table is model/configuration-level"
          ]
        },
        {
          "url": "https://www.chevrolet.ca/byo-vc/client/en/CA/chevrolet/silverado/2025/silverado-1500/config/specifications/1",
          "fields": [
            "2025 Silverado Crew Cab Short Bed box length 1,776 mm and four-door crew cab / passenger-capacity distinction"
          ]
        },
        {
          "url": "https://www.chevrolet.ca/byo-vc/client/en/CA/chevrolet/silverado/2025/silverado-1500/trims/features/458921/ads/savedbuilds",
          "fields": [
            "2025 Canadian Custom 4WD with 2.7L TurboMax and 8-speed automatic"
          ]
        }
      ],
      "unknownFieldsExplicitlyNull": true,
      "paintCode": null
    },
    "gameplayModel": {
      "status": "provisional balancing data; not measured dyno data",
      "torqueCurve": {
        "rpm": [
          1000,
          1500,
          2000,
          2500,
          3000,
          3500,
          4500,
          5600
        ],
        "lbFt": [
          250,
          350,
          405,
          425,
          430,
          420,
          345,
          290.75
        ],
        "source": "estimated torque points for a gameplay model; not measured dyno data"
      },
      "powerDerivedFromTorque": true,
      "drivetrainLossFraction": null,
      "gearRatios": null,
      "shiftInterruptionMs": null,
      "clutchTorqueCapacityNm": null,
      "weightDistribution": null,
      "tireGrip": null,
      "tirePressureKPa": null,
      "temperatureModel": null,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "upgradePotential": null,
      "reliability": null,
      "performanceClass": null,
      "performancePoints": null,
      "selectedFuelProfile": "manufacturer-rated regular fuel",
      "powerCurveDerivedFromTorque": [
        {
          "rpm": 1000,
          "hp": 47.6
        },
        {
          "rpm": 1500,
          "hp": 99.96
        },
        {
          "rpm": 2000,
          "hp": 154.23
        },
        {
          "rpm": 2500,
          "hp": 202.3
        },
        {
          "rpm": 3000,
          "hp": 245.62
        },
        {
          "rpm": 3500,
          "hp": 279.89
        },
        {
          "rpm": 4000,
          "hp": 291.32
        },
        {
          "rpm": 4500,
          "hp": 295.6
        },
        {
          "rpm": 5000,
          "hp": 304.97
        },
        {
          "rpm": 5500,
          "hp": 309.64
        },
        {
          "rpm": 5600,
          "hp": 310.02
        }
      ],
      "expectedPeakHorsepowerHp": 310,
      "interpolatedPeakHorsepowerHp": 310.015,
      "notes": [
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve.",
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve."
      ]
    }
  },
  "kia-forte-gt-sedan-2022-orange": {
    "manufacturerReference": {
      "year": 2022,
      "make": "Kia",
      "model": "Forte",
      "trim": "GT Limited (Canadian naming; equivalent requested GT 1.6T sedan)",
      "market": "Canada for requested factory palette/GT Limited; some equipment cross-checks from U.S. documents",
      "body": "4-door sedan",
      "requestedPaint": "Orange Delight (factory palette name; exact GT Limited paint pairing is subject to Kia availability constraints)",
      "engine": {
        "displacementL": 1.6,
        "layout": "inline",
        "cylinders": 4,
        "aspiration": "turbocharged direct injection",
        "fuelType": "gasoline"
      },
      "power": [
        {
          "hp": 201,
          "rpm": 6000
        }
      ],
      "torque": [
        {
          "lbFt": 195,
          "rpmRange": [
            1500,
            4500
          ]
        }
      ],
      "redlineRpm": null,
      "curbMassKg": {
        "min": 1366,
        "max": 1397,
        "sourceUnit": "lb",
        "sourceRange": [
          3012,
          3079
        ],
        "configuration": "GT DCT; equipment dependent"
      },
      "drivetrain": "FWD",
      "transmission": {
        "type": "7-speed dual-clutch automatic (initial); optional 6-speed manual",
        "gears": 7,
        "ratios": [
          3.643,
          2.174,
          1.826,
          1.024,
          0.809,
          0.854,
          0.717
        ],
        "finalDriveByGear": {
          "1": 4.643,
          "2": 4.643,
          "3": 3.611,
          "4": 4.643,
          "5": 4.643,
          "6": 3.611,
          "7": 3.611
        },
        "alternate6SpeedManual": {
          "ratios": [
            3.308,
            1.962,
            1.323,
            1.024,
            0.825,
            0.702
          ],
          "finalDrive": null
        }
      },
      "tireSize": "P225/40R18",
      "wheelbaseMm": 2700,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "notes": [
        "True GT trim, not GT-Line.",
        "Requested orange is applied to the artwork; factory paint availability/name varies by market.",
        "Default orange is the brochure name Orange Delight. User-requested orange is used in the illustration without asserting a verified GT Limited paint pairing.",
        "Kia brochure says color/trim combinations may be limited. Paint code is not shown in the cited brochure.",
        "Canadian GT Limited is the 1.6L turbo GDI 201 hp/195 lb-ft 7DCT model; U.S. GT-Line is a different 147 hp trim.",
        "Canadian GT Limited is the 1.6L turbo GDI 201 hp/195 lb-ft 7DCT model; U.S. GT-Line is a different 147 hp trim."
      ],
      "sourceFieldMap": [
        {
          "url": "https://www.kia.ca/content/dam/marketing/content/vehicles/brochures/2022/forte/MY22_Forte_NOV19_ENG.pdf",
          "fields": [
            "Canadian GT Limited 1.6L turbo GDI engine, 201 hp/6000 rpm, 195 lb-ft/1500\u20134500 rpm, 7-speed DCT, FWD",
            "2022 Forte sedan color names, 18-inch alloy wheels with red accents, color/trim combination caveat"
          ]
        },
        {
          "url": "https://www.kiamedia.com/us/en/media/specifications/20027/2022-kia-forte-specifications",
          "fields": [
            "U.S.-market equipment, gear ratios, final drives, curb mass and dimensions where shown"
          ]
        },
        {
          "url": "https://www.kiamedia.com/us/en/models/forte/2022/features",
          "fields": [
            "2022 U.S. GT versus GT-Line distinction and exterior GT feature list"
          ]
        },
        {
          "url": "https://www.kiamedia.com/image/low/17923/1/2?v=3",
          "fields": [
            "Visual rear reference for 2022 refreshed Forte rear diffuser/outlet surrounds; photo trim not treated as definitive GT proof"
          ]
        }
      ],
      "unknownFieldsExplicitlyNull": true,
      "paintCode": null
    },
    "gameplayModel": {
      "status": "provisional balancing data; not measured dyno data",
      "torqueCurve": {
        "rpm": [
          1000,
          1500,
          2500,
          3500,
          4500,
          5500,
          6000,
          6500
        ],
        "lbFt": [
          115,
          195,
          195,
          195,
          195,
          180,
          175.9,
          160
        ],
        "source": "estimated torque points for a gameplay model; not measured dyno data"
      },
      "powerDerivedFromTorque": true,
      "drivetrainLossFraction": null,
      "gearRatios": [
        3.643,
        2.174,
        1.826,
        1.024,
        0.809,
        0.854,
        0.717
      ],
      "shiftInterruptionMs": null,
      "clutchTorqueCapacityNm": null,
      "weightDistribution": null,
      "tireGrip": null,
      "tirePressureKPa": null,
      "temperatureModel": null,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "upgradePotential": null,
      "reliability": null,
      "performanceClass": null,
      "performancePoints": null,
      "selectedFuelProfile": "manufacturer-rated regular fuel",
      "powerCurveDerivedFromTorque": [
        {
          "rpm": 1000,
          "hp": 21.9
        },
        {
          "rpm": 1500,
          "hp": 55.69
        },
        {
          "rpm": 2000,
          "hp": 74.26
        },
        {
          "rpm": 2500,
          "hp": 92.82
        },
        {
          "rpm": 3000,
          "hp": 111.39
        },
        {
          "rpm": 3500,
          "hp": 129.95
        },
        {
          "rpm": 4000,
          "hp": 148.51
        },
        {
          "rpm": 4500,
          "hp": 167.08
        },
        {
          "rpm": 5000,
          "hp": 178.5
        },
        {
          "rpm": 5500,
          "hp": 188.5
        },
        {
          "rpm": 6000,
          "hp": 200.95
        },
        {
          "rpm": 6500,
          "hp": 198.02
        }
      ],
      "expectedPeakHorsepowerHp": 201,
      "interpolatedPeakHorsepowerHp": 200.952,
      "notes": [
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve.",
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve."
      ]
    }
  },
  "nissan-rogue-2020-red": {
    "manufacturerReference": {
      "year": 2020,
      "make": "Nissan",
      "model": "Rogue",
      "trim": "SV (provisional visual/spec assumption)",
      "market": "United States for provisional SV/AWD powertrain; Canada for factory palette",
      "body": "2nd-generation T32 4-door crossover SUV",
      "requestedPaint": "Scarlet Ember (NBL; 2020 Canadian Rogue brochure name)",
      "engine": {
        "displacementL": 2.5,
        "layout": "inline",
        "cylinders": 4,
        "aspiration": "naturally aspirated",
        "fuelType": "gasoline"
      },
      "power": [
        {
          "hp": 170,
          "rpm": 6000
        }
      ],
      "torque": [
        {
          "lbFt": 175,
          "rpm": 4400
        }
      ],
      "redlineRpm": null,
      "curbMassKg": null,
      "drivetrain": "AWD (provisional assumption; trim/drive not specified by user)",
      "transmission": {
        "type": "Xtronic CVT with D-Step Shift Logic",
        "gears": null,
        "ratios": null,
        "finalDrive": null
      },
      "tireSize": "P225/65R17 (SV base configuration; optional P225/60R18 with package)",
      "wheelbaseMm": 2706,
      "lengthMm": 4686,
      "widthMm": 1840,
      "heightMm": 1741,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "notes": [
        "Preserves 2020 T32 body; not the redesigned 2021 Rogue or Rogue Sport.",
        "SV AWD is a provisional assumption, not a user-supplied trim/drive selection.",
        "CVT does not have conventional fixed forward gear ratios; none are fabricated.",
        "Default red is Scarlet Ember (paint code NBL), as named in the 2020 Canadian Rogue brochure.",
        "No digital RGB/hex is claimed from the printed brochure.",
        "Canadian palette uses color names/codes from the exact-year brochure; selected SV/AWD remains provisional and based on U.S. reference.",
        "Canadian palette uses color names/codes from the exact-year brochure; selected SV/AWD remains provisional and based on U.S. reference."
      ],
      "sourceFieldMap": [
        {
          "url": "https://usa.nissannews.com/en-US/releases/2020-nissan-rogue-key-facts-and-figures",
          "fields": [
            "2020 U.S. Rogue engine output and CVT; body generation and model facts"
          ]
        },
        {
          "url": "https://usa.nissannews.com/en-US/releases/2020-nissan-rogue-overview",
          "fields": [
            "U.S. trim and drive availability; options overview"
          ]
        },
        {
          "url": "https://www.nissanusa.com/content/dam/Nissan/us/vehicle-brochures/2020/2020-nissan-rogue-brochure-en.pdf",
          "fields": [
            "U.S. model equipment and available tire/trim context"
          ]
        },
        {
          "url": "https://www.nissan.ca/content/dam/Nissan/Canada/vehicle-brochures/en/2020/2020-nissan-rogue-en.pdf",
          "fields": [
            "Canadian factory palette names and paint codes including Scarlet Ember NBL"
          ]
        }
      ],
      "unknownFieldsExplicitlyNull": true,
      "paintCode": "NBL"
    },
    "gameplayModel": {
      "status": "provisional balancing data; not measured dyno data",
      "torqueCurve": {
        "rpm": [
          1000,
          1800,
          2500,
          3500,
          4400,
          5000,
          6000,
          6500
        ],
        "lbFt": [
          125,
          155,
          165,
          172,
          175,
          168,
          148.7,
          135
        ],
        "source": "estimated torque points for a gameplay model; not measured dyno data"
      },
      "powerDerivedFromTorque": true,
      "drivetrainLossFraction": null,
      "gearRatios": null,
      "shiftInterruptionMs": null,
      "clutchTorqueCapacityNm": null,
      "weightDistribution": null,
      "tireGrip": null,
      "tirePressureKPa": null,
      "temperatureModel": null,
      "dragCoefficient": null,
      "frontalAreaM2": null,
      "upgradePotential": null,
      "reliability": null,
      "performanceClass": null,
      "performancePoints": null,
      "selectedFuelProfile": "manufacturer-rated regular fuel",
      "powerCurveDerivedFromTorque": [
        {
          "rpm": 1000,
          "hp": 23.8
        },
        {
          "rpm": 1500,
          "hp": 41.06
        },
        {
          "rpm": 2000,
          "hp": 60.11
        },
        {
          "rpm": 2500,
          "hp": 78.54
        },
        {
          "rpm": 3000,
          "hp": 96.25
        },
        {
          "rpm": 3500,
          "hp": 114.62
        },
        {
          "rpm": 4000,
          "hp": 132.27
        },
        {
          "rpm": 4500,
          "hp": 148.94
        },
        {
          "rpm": 5000,
          "hp": 159.94
        },
        {
          "rpm": 5500,
          "hp": 165.83
        },
        {
          "rpm": 6000,
          "hp": 169.88
        },
        {
          "rpm": 6500,
          "hp": 167.08
        }
      ],
      "expectedPeakHorsepowerHp": 170,
      "interpolatedPeakHorsepowerHp": 169.878,
      "notes": [
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve.",
        "Interpolated 10-rpm torque-to-power sweep is checked against selected factory horsepower rating; torque/power curve remains an estimated balancing curve."
      ]
    }
  }
};
