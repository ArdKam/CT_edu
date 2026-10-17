# CT Edu Segmentor — anatomical coverage registry

**Registry schema:** 1  
**Last updated:** 2026-10-17  
**Baseline checked:** `main` at `b1074711b5ac7f70b592d761df1fdb2536d2e977`  
**Pinned baseline model:** TotalSegmentator 2.11.0, task `total`, CPU, `fast/3mm`

This page summarizes `SEGMENTOR_COVERAGE_REGISTRY.json`, the machine-readable record of upstream class availability versus what CT Edu has actually generated, technically checked, independently evaluated, anatomically reviewed and approved.

## Current evidence

- The pinned [TotalSegmentator v2.11.0 class map](https://github.com/wasserth/TotalSegmentator/blob/v2.11.0/totalsegmentator/map_to_binary.py) confirms 117 named classes in the `total` CT task.
- CT Edu currently generates only 4 of those classes for the SPL Abdominal Atlas: liver, spleen and both kidneys.
- Their masks passed software output/geometry and sampled three-plane overlay checks. This is **technical validation only**, not a finding that every boundary is anatomically correct.
- Current model output Dice against the bundled labels from the same atlas is shown below. Same-volume overlap is not independent held-out evaluation.
- Independent held-out evaluation, qualified anatomical review and approval for broader educational use remain outstanding for all 117 classes.
- Upstream class availability does not guarantee that a structure is present, visible or resolvable in an arbitrary scan. Missing field-of-view coverage and unsupported acquisition conditions must be reported instead of inventing masks.

- The repository also now has a **controlled external-NIfTI inference CLI** at `scripts/infer_external_ct_volume.py`. It supports the same four major-organ classes for a supplied local 3D NIfTI and writes masks with provenance; it is not a public upload endpoint and does not change the precomputed SPL preview.
- No independent external cohort has been processed by this CLI as of this baseline. Therefore the generated-prediction count in this registry remains 4 (the SPL preview), independent evaluation remains 0, and anatomical review/educational approval remain 0.
- The bundled SPL generator now records exact source-member hashes, uses atomic artifact publication/failure recovery, and explicitly writes millimetre spatial units to its generated NIfTI masks. Its 1024 intensity offset remains an unverified hypothesis.

## Implementation status summary

| Status | Number of classes |
|---|---:|
| Technically validated for output/geometry only | 4 |
| Model available, not evaluated in CT Edu | 113 |
| Independently evaluated | 0 |
| Anatomically reviewed | 0 |
| Approved for educational use | 0 |

**State definitions:** `technically-validated` means software/output and geometry checks passed; it does not mean anatomical validity. `model-available-not-evaluated` means the upstream pinned class map contains the class but CT Edu has not run it. `independently-evaluated`, `anatomically-reviewed` and `approved-for-educational-use` are separate future gates.

## Generated SPL outputs

| Structure | Current 3D mask | Dice vs bundled same-volume label | Evaluation state |
|---|---|---:|---|
| Spleen | `spleen.nii.gz` | 0.798250 | same-volume-reference-comparison-only |
| Right kidney | `kidney_right.nii.gz` | 0.881390 | same-volume-reference-comparison-only |
| Left kidney | `kidney_left.nii.gz` | 0.891300 | same-volume-reference-comparison-only |
| Liver | `liver.nii.gz` | 0.913840 | same-volume-reference-comparison-only |

Source volume geometry: 256 × 256 × 113 voxels, RAS after LPS conversion, spacing approximately 0.9375 × 0.9375 × 1.5 mm. Stored intensity values are **not confirmed HU**. The `-1024` subtraction is an experimental hypothesis, not verified calibration. Details remain in the current prediction manifest and the intensity-calibration investigation.

## Candidate specialized tasks

| Pinned TotalSegmentator task | CT Edu state | Classes advertised in pinned README | Licensing note |
|---|---|---|---|
| `total` | baseline-task-used | 117 classes | Apache-2.0 |
| `lung_vessels` | candidate-not-run | 2 named classes | Apache-2.0 |
| `headneck_bones_vessels` | candidate-not-run | 12 named classes | Apache-2.0 |
| `liver_vessels` | candidate-not-run | 2 named classes | Apache-2.0 |
| `heartchambers_highres` | candidate-license-review-required | 7 named classes | license-required; non-commercial academic licenses are described by the vendor |
| `coronary_arteries` | candidate-license-review-required | 1 named classes | license-required; non-commercial academic licenses are described by the vendor |
| `brain_structures` | candidate-license-review-required | 16 named classes | license-required; non-commercial academic licenses are described by the vendor |

Source for task list and task-level license statements: [TotalSegmentator v2.11.0 README](https://github.com/wasserth/TotalSegmentator/blob/v2.11.0/README.md). These tasks have **not** been run by this registry change. `heartchambers_highres`, `coronary_arteries`, and `brain_structures` are recorded as requiring task-license review before adoption. The pinned README flags `liver_vessels` as trained on a smaller/different dataset and advises expecting lower robustness; that warning is not a measured CT Edu result.

No specialist task is automatically enabled. First confirm its exact task/weight terms and acquisition needs, then benchmark it on appropriate data. Vessel evaluation must separately examine centerline continuity, branch coverage, false-positive branches and physical boundary errors rather than relying on Dice alone.

## Anatomy group inventory (the 117-class upstream `total` task)

| Group | Number of model classes |
|---|---:|
| airway | 1 |
| cardiac-substructure | 1 |
| digestive-structure | 5 |
| gland | 3 |
| muscle | 10 |
| neuroanatomical-structure | 2 |
| organ | 9 |
| pathology-or-lesion | 2 |
| respiratory-organ-substructure | 5 |
| skeletal-structure | 63 |
| vessel | 16 |

## Full upstream class coverage table

This table is a versioned inventory of the pinned TotalSegmentator class map—not a claim that CT Edu has segmented or validated all classes.

| Upstream label ID | CT Edu stable ID | Display name | Anatomical group | Laterality | CT Edu implementation status | Evaluation state |
|---:|---|---|---|---|---|---|
| 1 | `anatomy.spleen` | Spleen | organ | not-applicable-or-not-encoded | technically-validated | same-volume-reference-comparison-only |
| 2 | `anatomy.kidney_right` | Right kidney | organ | right | technically-validated | same-volume-reference-comparison-only |
| 3 | `anatomy.kidney_left` | Left kidney | organ | left | technically-validated | same-volume-reference-comparison-only |
| 4 | `anatomy.gallbladder` | Gallbladder | organ | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 5 | `anatomy.liver` | Liver | organ | not-applicable-or-not-encoded | technically-validated | same-volume-reference-comparison-only |
| 6 | `anatomy.stomach` | Stomach | digestive-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 7 | `anatomy.pancreas` | Pancreas | organ | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 8 | `anatomy.adrenal_gland_right` | Adrenal Gland Right | gland | right | model-available-not-evaluated | not-evaluated |
| 9 | `anatomy.adrenal_gland_left` | Adrenal Gland Left | gland | left | model-available-not-evaluated | not-evaluated |
| 10 | `anatomy.lung_upper_lobe_left` | Lung Upper Lobe Left | respiratory-organ-substructure | left | model-available-not-evaluated | not-evaluated |
| 11 | `anatomy.lung_lower_lobe_left` | Lung Lower Lobe Left | respiratory-organ-substructure | left | model-available-not-evaluated | not-evaluated |
| 12 | `anatomy.lung_upper_lobe_right` | Lung Upper Lobe Right | respiratory-organ-substructure | right | model-available-not-evaluated | not-evaluated |
| 13 | `anatomy.lung_middle_lobe_right` | Lung Middle Lobe Right | respiratory-organ-substructure | right | model-available-not-evaluated | not-evaluated |
| 14 | `anatomy.lung_lower_lobe_right` | Lung Lower Lobe Right | respiratory-organ-substructure | right | model-available-not-evaluated | not-evaluated |
| 15 | `anatomy.esophagus` | Esophagus | digestive-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 16 | `anatomy.trachea` | Trachea | airway | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 17 | `anatomy.thyroid_gland` | Thyroid Gland | gland | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 18 | `anatomy.small_bowel` | Small Bowel | digestive-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 19 | `anatomy.duodenum` | Duodenum | digestive-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 20 | `anatomy.colon` | Colon | digestive-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 21 | `anatomy.urinary_bladder` | Urinary Bladder | organ | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 22 | `anatomy.prostate` | Prostate | organ | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 23 | `anatomy.kidney_cyst_left` | Left renal cyst | pathology-or-lesion | left | model-available-not-evaluated | not-evaluated |
| 24 | `anatomy.kidney_cyst_right` | Right renal cyst | pathology-or-lesion | right | model-available-not-evaluated | not-evaluated |
| 25 | `anatomy.sacrum` | Sacrum | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 26 | `anatomy.vertebrae_s1` | S1 vertebra | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 27 | `anatomy.vertebrae_l5` | Vertebrae L5 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 28 | `anatomy.vertebrae_l4` | Vertebrae L4 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 29 | `anatomy.vertebrae_l3` | Vertebrae L3 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 30 | `anatomy.vertebrae_l2` | Vertebrae L2 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 31 | `anatomy.vertebrae_l1` | Vertebrae L1 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 32 | `anatomy.vertebrae_t12` | Vertebrae T12 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 33 | `anatomy.vertebrae_t11` | Vertebrae T11 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 34 | `anatomy.vertebrae_t10` | Vertebrae T10 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 35 | `anatomy.vertebrae_t9` | Vertebrae T9 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 36 | `anatomy.vertebrae_t8` | Vertebrae T8 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 37 | `anatomy.vertebrae_t7` | Vertebrae T7 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 38 | `anatomy.vertebrae_t6` | Vertebrae T6 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 39 | `anatomy.vertebrae_t5` | Vertebrae T5 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 40 | `anatomy.vertebrae_t4` | Vertebrae T4 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 41 | `anatomy.vertebrae_t3` | Vertebrae T3 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 42 | `anatomy.vertebrae_t2` | Vertebrae T2 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 43 | `anatomy.vertebrae_t1` | Vertebrae T1 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 44 | `anatomy.vertebrae_c7` | Vertebrae C7 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 45 | `anatomy.vertebrae_c6` | Vertebrae C6 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 46 | `anatomy.vertebrae_c5` | Vertebrae C5 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 47 | `anatomy.vertebrae_c4` | Vertebrae C4 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 48 | `anatomy.vertebrae_c3` | Vertebrae C3 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 49 | `anatomy.vertebrae_c2` | Vertebrae C2 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 50 | `anatomy.vertebrae_c1` | Vertebrae C1 | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 51 | `anatomy.heart` | Heart | organ | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 52 | `anatomy.aorta` | Aorta | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 53 | `anatomy.pulmonary_vein` | Pulmonary Vein | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 54 | `anatomy.brachiocephalic_trunk` | Brachiocephalic Trunk | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 55 | `anatomy.subclavian_artery_right` | Subclavian Artery Right | vessel | right | model-available-not-evaluated | not-evaluated |
| 56 | `anatomy.subclavian_artery_left` | Subclavian Artery Left | vessel | left | model-available-not-evaluated | not-evaluated |
| 57 | `anatomy.common_carotid_artery_right` | Common Carotid Artery Right | vessel | right | model-available-not-evaluated | not-evaluated |
| 58 | `anatomy.common_carotid_artery_left` | Common Carotid Artery Left | vessel | left | model-available-not-evaluated | not-evaluated |
| 59 | `anatomy.brachiocephalic_vein_left` | Brachiocephalic Vein Left | vessel | left | model-available-not-evaluated | not-evaluated |
| 60 | `anatomy.brachiocephalic_vein_right` | Brachiocephalic Vein Right | vessel | right | model-available-not-evaluated | not-evaluated |
| 61 | `anatomy.atrial_appendage_left` | Atrial Appendage Left | cardiac-substructure | left | model-available-not-evaluated | not-evaluated |
| 62 | `anatomy.superior_vena_cava` | Superior vena cava | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 63 | `anatomy.inferior_vena_cava` | Inferior vena cava | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 64 | `anatomy.portal_vein_and_splenic_vein` | Portal and splenic veins | vessel | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 65 | `anatomy.iliac_artery_left` | Iliac Artery Left | vessel | left | model-available-not-evaluated | not-evaluated |
| 66 | `anatomy.iliac_artery_right` | Iliac Artery Right | vessel | right | model-available-not-evaluated | not-evaluated |
| 67 | `anatomy.iliac_vena_left` | Left iliac vein | vessel | left | model-available-not-evaluated | not-evaluated |
| 68 | `anatomy.iliac_vena_right` | Right iliac vein | vessel | right | model-available-not-evaluated | not-evaluated |
| 69 | `anatomy.humerus_left` | Humerus Left | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 70 | `anatomy.humerus_right` | Humerus Right | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 71 | `anatomy.scapula_left` | Scapula Left | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 72 | `anatomy.scapula_right` | Scapula Right | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 73 | `anatomy.clavicula_left` | Clavicula Left | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 74 | `anatomy.clavicula_right` | Clavicula Right | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 75 | `anatomy.femur_left` | Femur Left | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 76 | `anatomy.femur_right` | Femur Right | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 77 | `anatomy.hip_left` | Hip Left | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 78 | `anatomy.hip_right` | Hip Right | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 79 | `anatomy.spinal_cord` | Spinal Cord | neuroanatomical-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 80 | `anatomy.gluteus_maximus_left` | Gluteus Maximus Left | muscle | left | model-available-not-evaluated | not-evaluated |
| 81 | `anatomy.gluteus_maximus_right` | Gluteus Maximus Right | muscle | right | model-available-not-evaluated | not-evaluated |
| 82 | `anatomy.gluteus_medius_left` | Gluteus Medius Left | muscle | left | model-available-not-evaluated | not-evaluated |
| 83 | `anatomy.gluteus_medius_right` | Gluteus Medius Right | muscle | right | model-available-not-evaluated | not-evaluated |
| 84 | `anatomy.gluteus_minimus_left` | Gluteus Minimus Left | muscle | left | model-available-not-evaluated | not-evaluated |
| 85 | `anatomy.gluteus_minimus_right` | Gluteus Minimus Right | muscle | right | model-available-not-evaluated | not-evaluated |
| 86 | `anatomy.autochthon_left` | Autochthon Left | muscle | left | model-available-not-evaluated | not-evaluated |
| 87 | `anatomy.autochthon_right` | Autochthon Right | muscle | right | model-available-not-evaluated | not-evaluated |
| 88 | `anatomy.iliopsoas_left` | Iliopsoas Left | muscle | left | model-available-not-evaluated | not-evaluated |
| 89 | `anatomy.iliopsoas_right` | Iliopsoas Right | muscle | right | model-available-not-evaluated | not-evaluated |
| 90 | `anatomy.brain` | Brain | neuroanatomical-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 91 | `anatomy.skull` | Skull | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 92 | `anatomy.rib_left_1` | Rib Left 1 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 93 | `anatomy.rib_left_2` | Rib Left 2 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 94 | `anatomy.rib_left_3` | Rib Left 3 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 95 | `anatomy.rib_left_4` | Rib Left 4 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 96 | `anatomy.rib_left_5` | Rib Left 5 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 97 | `anatomy.rib_left_6` | Rib Left 6 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 98 | `anatomy.rib_left_7` | Rib Left 7 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 99 | `anatomy.rib_left_8` | Rib Left 8 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 100 | `anatomy.rib_left_9` | Rib Left 9 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 101 | `anatomy.rib_left_10` | Rib Left 10 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 102 | `anatomy.rib_left_11` | Rib Left 11 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 103 | `anatomy.rib_left_12` | Rib Left 12 | skeletal-structure | left | model-available-not-evaluated | not-evaluated |
| 104 | `anatomy.rib_right_1` | Rib Right 1 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 105 | `anatomy.rib_right_2` | Rib Right 2 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 106 | `anatomy.rib_right_3` | Rib Right 3 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 107 | `anatomy.rib_right_4` | Rib Right 4 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 108 | `anatomy.rib_right_5` | Rib Right 5 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 109 | `anatomy.rib_right_6` | Rib Right 6 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 110 | `anatomy.rib_right_7` | Rib Right 7 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 111 | `anatomy.rib_right_8` | Rib Right 8 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 112 | `anatomy.rib_right_9` | Rib Right 9 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 113 | `anatomy.rib_right_10` | Rib Right 10 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 114 | `anatomy.rib_right_11` | Rib Right 11 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 115 | `anatomy.rib_right_12` | Rib Right 12 | skeletal-structure | right | model-available-not-evaluated | not-evaluated |
| 116 | `anatomy.sternum` | Sternum | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |
| 117 | `anatomy.costal_cartilages` | Costal Cartilages | skeletal-structure | not-applicable-or-not-encoded | model-available-not-evaluated | not-evaluated |

## Data rights and governance

- The pinned TotalSegmentator v2.11.0 README lists `total` and `lung_vessels` under its openly available Apache-2.0 tasks. Other tasks have separate licensing statements; consult the pinned README rather than inferring license from a class name.
- CT Edu does not vendor model weights. Upstream code/task licensing and permission to redistribute downloaded model weights are separate questions and must be reviewed against the exact artifact.
- The SPL Abdominal Atlas has a separate 3D Slicer License Part B notice. This registry does not close the source-data, third-party rights, or derived-output redistribution gate.
- Original atlas labels stay authoritative reference data and are not replaced by model predictions.
- No public-release approval flag is changed here. The existing preview remains experimental and non-diagnostic.

## Machine-readable file

See [`SEGMENTOR_COVERAGE_REGISTRY.json`](SEGMENTOR_COVERAGE_REGISTRY.json) for each structure's stable ID, model/task/version/label ID, implementation state, technical validation scope, per-structure same-volume Dice where present, independent evaluation state, anatomical review state, educational approval state, acquisition cautions and rights-review state.
