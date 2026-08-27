/*
 * ALPHA Construction Core
 *
 * This file intentionally uses only ECMAScript language features and does not
 * load files, use Node APIs, or depend on AJV. A caller validates the contract
 * before calling calculateConstructionCore().
 */

var ALPHA_PROVENANCE = {
  woodworkingShop: {
    Repository: 'WoodworkingShop',
    Commit: '9f6f1ff51b0e50cb54c7df832eac78023c389b31',
    Source_path: 'src/engine/parts.ts',
    Source_function_or_logic: 'generateParts carcass panel geometry',
    Adaptation: 'Reimplemented as plain JavaScript for confirmed-configuration-v1; explicit module dimensions remain authoritative.'
  },
  woodworkingShopEdge: {
    Repository: 'WoodworkingShop',
    Commit: '9f6f1ff51b0e50cb54c7df832eac78023c389b31',
    Source_path: 'src/engine/edge-banding-calc.ts',
    Source_function_or_logic: 'calculateEdgeBanding edgeLength/grouping',
    Adaptation: 'Per-side edge lengths are emitted on each physical part and grouped by material code.'
  },
  woodworkingShopHinge: {
    Repository: 'WoodworkingShop',
    Commit: '9f6f1ff51b0e50cb54c7df832eac78023c389b31',
    Source_path: 'src/engine/hinge-bore.ts',
    Source_function_or_logic: 'hingeCount threshold rule',
    Adaptation: 'Used only as a provisional diagnostic rule for visible hinged fronts; no input front dimensions are invented.'
  },
  alphaLocalDowelProvision: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha assumption: four DOWELS_8x30 positions per physical carcass module',
    Adaptation: 'WoodworkingShop src/engine/dowel-joint.ts was inspected for terminology only. No OSS dowel selection, joint length, spacing, or drilling layout algorithm is executed.'
  },
  alphaLocalFastenerProvision: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha assumption: eight CONFIRMATS_7x50 per physical carcass module',
    Adaptation: 'No OSS confirmat/fastener count algorithm was adapted; this is an alpha calibration constant.'
  },
  alphaLocalMountingPlateProvision: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha assumption: one mounting plate per calculated hinge',
    Adaptation: 'The one-to-one plate quantity is a local alpha assumption; no vendor mounting-plate schedule is executed.'
  },
  alphaLocalDrawerProvision: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha assumption: fixed drawer box clearances and height/depth reductions',
    Adaptation: 'cabinet-studio drawer sizing was inspected for terminology only. No vendor drawer system model is executed; drawer boxes replicate per front.count of the alpha box geometry.'
  },
  alphaLocalBackPolicy: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha rule: back panels are generated only for tall cabinet modules',
    Adaptation: 'Alpha scope decision. OSS back-construction modes for non-tall modules are intentionally not implemented in this stage.'
  },
  alphaLocalBaseHardwareProvision: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha assumption: fixed legs and plinth clips per physical base cabinet module',
    Adaptation: 'Alpha calibration constants; not a Basis-derived or OSS-derived hardware rule.'
  },
  alphaLocalEdgePolicy: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'Provisional alpha edge exposure policy for front-facing sides',
    Adaptation: 'Basis/production edge exposure policy is not restored. The current per-part-type side mapping is an alpha assumption pending part-level reference data.'
  },
  alphaLocalDrawerMechanismGap: {
    Origin: 'OUR',
    Repository: null,
    Commit: null,
    Source_path: null,
    Source_function_or_logic: 'No vendor drawer mechanism mapping is implemented in the alpha core',
    Adaptation: 'No mechanism quantity is guessed while vendor-specific drawer data is outside alpha scope.'
  },
  cabinetStudioReference: {
    Repository: 'cabinet-studio',
    Commit: '1caae5ba9b362ff40cc652a1ba797e8164468d66',
    Source_path: 'js/cabinet-math.js',
    Source_function_or_logic: 'computePanels panel/feature data model',
    Adaptation: 'Reference only; no source code copied because a permissive license was not confirmed.'
  }
};

var RULES = {
  profileId: 'alpha-basis-v1',
  status: 'PROVISIONAL_ALPHA',
  dimensions: {
    rear_clearance_mm: 0,
    wall_depth_reduction_mm: 40,
    horizontal_width_reduction_mm: 32,
    back_panel_top_clearance_mm: 10,
    drawer_side_clearance_mm: 13,
    drawer_box_bottom_clearance_mm: 2,
    drawer_box_height_reduction_mm: 30,
    drawer_box_depth_reduction_mm: 30
  },
  edge: {
    carcass_visible_sides: ['front'],
    facade_visible_sides: ['top', 'bottom', 'left', 'right'],
    back_visible_sides: []
  },
  hardware: {
    legs_per_base_module: 4,
    plinth_clips_per_base_module: 2,
    confirmats_per_carcass_module: 8,
    dowels_per_carcass_module: 4,
    drawer_mechanisms_per_drawer: 1,
    mounting_plates_per_hinge: 1,
    hinge_thresholds_mm: [600, 1200, 1800, 2200]
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function issue(code, status, message, path, sourceRule) {
  return {
    code: code,
    status: status,
    message: message,
    path: path || null,
    source_rule: sourceRule || null
  };
}

function sourceRule(ruleId, ruleStatus, provenance, note) {
  return {
    rule_id: ruleId,
    status: ruleStatus,
    provenance: clone(provenance),
    note: note || null
  };
}

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function loadConstructionProfile(profile) {
  var errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    errors.push(issue('PROFILE_NOT_OBJECT', 'VALIDATION_ERROR', 'Construction profile must be an object.', '$profile'));
  } else {
    if (typeof profile.profile_id !== 'string' || !profile.profile_id) {
      errors.push(issue('PROFILE_ID_REQUIRED', 'VALIDATION_ERROR', 'Construction profile must have profile_id.', '$profile.profile_id'));
    }
    if (!profile.materials || !profile.materials.carcass || !profile.materials.back || !profile.materials.edge_default) {
      errors.push(issue('PROFILE_MATERIALS_REQUIRED', 'VALIDATION_ERROR', 'Construction profile must define carcass, back, and edge materials.', '$profile.materials'));
    } else {
      ['carcass', 'back', 'edge_default'].forEach(function (key) {
        var material = profile.materials[key];
        if (typeof material.material_code !== 'string' || !material.material_code || !positiveNumber(material.thickness_mm)) {
          errors.push(issue('PROFILE_MATERIAL_INVALID', 'VALIDATION_ERROR', 'Profile material ' + key + ' must have a code and positive thickness.', '$profile.materials.' + key));
        }
      });
    }
    if (!profile.dimension_defaults || !profile.dimension_defaults.base_carcass_depth_mm || !profile.dimension_defaults.tall_carcass_depth_mm || !profile.dimension_defaults.wall_carcass_depth_mm) {
      errors.push(issue('PROFILE_DIMENSIONS_REQUIRED', 'VALIDATION_ERROR', 'Construction profile must define all carcass depth defaults.', '$profile.dimension_defaults'));
    } else {
      ['base_carcass_depth_mm', 'tall_carcass_depth_mm', 'wall_carcass_depth_mm'].forEach(function (key) {
        if (!positiveNumber(profile.dimension_defaults[key].value)) {
          errors.push(issue('PROFILE_DIMENSION_INVALID', 'VALIDATION_ERROR', 'Profile dimension ' + key + ' must have a positive value.', '$profile.dimension_defaults.' + key + '.value'));
        }
      });
    }
  }
  if (errors.length) {
    var profileError = new Error('Construction profile validation error.');
    profileError.code = 'VALIDATION_ERROR';
    profileError.issues = errors;
    throw profileError;
  }
  return clone(profile);
}

function assertValidatedInput(input, profile) {
  var errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push(issue('INPUT_NOT_OBJECT', 'VALIDATION_ERROR', 'Input must be an object.', '$'));
  } else {
    if (input.schema_version !== 'confirmed-configuration-v1') {
      errors.push(issue('SCHEMA_VERSION_INVALID', 'VALIDATION_ERROR', 'Unsupported schema_version.', '$.schema_version'));
    }
    if (input.units !== 'mm') {
      errors.push(issue('UNITS_INVALID', 'VALIDATION_ERROR', 'Construction Core requires millimetres.', '$.units'));
    }
    if (!Array.isArray(input.assemblies) || input.assemblies.length === 0) {
      errors.push(issue('ASSEMBLIES_REQUIRED', 'VALIDATION_ERROR', 'At least one assembly is required.', '$.assemblies'));
    }
    if (!profile || profile.profile_id !== input.construction_profile_id) {
      errors.push(issue('PROFILE_MISMATCH', 'VALIDATION_ERROR', 'Input construction profile does not match the loaded profile.', '$.construction_profile_id'));
    }
    (input.assemblies || []).forEach(function (assembly, assemblyIndex) {
      if (!assembly || typeof assembly !== 'object' || !Array.isArray(assembly.modules)) {
        errors.push(issue('ASSEMBLY_INVALID', 'VALIDATION_ERROR', 'Each assembly must define a modules array.', '$.assemblies[' + assemblyIndex + ']'));
        return;
      }
      assembly.modules.forEach(function (module, moduleIndex) {
        var path = '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + ']';
        if (!module || typeof module !== 'object' || !positiveNumber(module.width_mm) || !positiveNumber(module.height_mm)) {
          errors.push(issue('MODULE_DIMENSIONS_INVALID', 'VALIDATION_ERROR', 'Each module must have positive width_mm and height_mm.', path));
        }
        if (module && module.depth_mm !== null && module.depth_mm !== undefined && !positiveNumber(module.depth_mm)) {
          errors.push(issue('MODULE_DEPTH_INVALID', 'VALIDATION_ERROR', 'A module depth, when present, must be positive.', path + '.depth_mm'));
        }
        if (module && module.quantity !== undefined && (!Number.isInteger(module.quantity) || module.quantity < 1)) {
          errors.push(issue('MODULE_QUANTITY_INVALID', 'VALIDATION_ERROR', 'A module quantity must be a positive integer.', path + '.quantity'));
        }
      });
    });
  }
  if (errors.length) {
    var error = new Error('Construction Core validation error.');
    error.code = 'VALIDATION_ERROR';
    error.issues = errors;
    throw error;
  }
}

function moduleDepth(module, assembly, rules) {
  if (positiveNumber(module.depth_mm)) return module.depth_mm;
  if (module.module_type === 'WALL_CABINET') return rules.dimension_defaults.wall_carcass_depth_mm.value;
  if (module.module_type === 'TALL_CABINET') return rules.dimension_defaults.tall_carcass_depth_mm.value;
  if (assembly.kind === 'ISLAND' || module.module_type === 'BASE_CABINET' || module.module_type === 'APPLIANCE_SLOT') {
    return rules.dimension_defaults.base_carcass_depth_mm.value;
  }
  return null;
}

function quantity(module) {
  return module.quantity === undefined ? 1 : module.quantity;
}

function part(moduleId, partType, qty, length, width, thickness, material, edgeSides, source, features) {
  var edgeTotal = edgeSides.reduce(function (sum, side) {
    return sum + edgeLength({ Length_mm: length, Width_mm: width }, side);
  }, 0) * qty / 1000;
  return {
    Module_id: moduleId,
    Part_type: partType,
    Qty: qty,
    Length_mm: length,
    Width_mm: width,
    Thickness_mm: thickness,
    Material_code: material,
    Component: 'CARCASS',
    Area_m2: length * width * qty / 1000000,
    Edge_length_m: edgeTotal,
    Edge_sides: edgeSides.slice(),
    Source_rule: clone(source),
    Holes: (features && features.Holes) || [],
    Grooves: (features && features.Grooves) || [],
    Notches: (features && features.Notches) || [],
    Joinery: (features && features.Joinery) || []
  };
}

function addPart(parts, module, partType, qty, length, width, thickness, material, edgeSides, source, features, component, edgeSource) {
  if (!positiveNumber(length) || !positiveNumber(width) || !positiveNumber(thickness) || !positiveNumber(qty)) {
    throw new Error('Derived part has a non-positive dimension: ' + module.id + '/' + partType);
  }
  var item = part(module.id, partType, qty, length, width, thickness, material, edgeSides, source, features);
  item.Component = component || (module.module_type === 'WALL_CABINET' ? 'WALL_CABINET_COMPONENT' : partType.indexOf('DRAWER_') === 0 ? 'DRAWER_COMPONENT' : partType === 'FACADE' ? 'FACADE_COMPONENT' : 'CARCASS');
  if (edgeSource && edgeSides.length) item.Edge_source_rule = clone(edgeSource);
  parts.push(item);
}

function moduleClass(module) {
  if (module.module_type === 'WALL_CABINET') return 'wall';
  if (module.module_type === 'TALL_CABINET') return 'tall';
  if (module.module_type === 'APPLIANCE_SLOT') return 'slot';
  return 'base';
}

function isBaseLike(module) {
  return module.module_type === 'BASE_CABINET' || module.module_type === 'APPLIANCE_SLOT';
}

function isDrawerModule(module) {
  return module.role === 'DRAWER_CABINET';
}

function hingeCount(height, rules) {
  var thresholds = rules.hardware.hinge_thresholds_mm;
  if (height <= thresholds[0]) return 2;
  if (height <= thresholds[1]) return 3;
  if (height <= thresholds[2]) return 4;
  if (height <= thresholds[3]) return 5;
  return 6;
}

function facadeDimensions(module, front, rules) {
  if (!front || !positiveNumber(front.width_mm) || !positiveNumber(front.height_mm)) return null;
  var count = front.count;
  var width = front.width_mm;
  var height = front.height_mm;
  return { count: count, width: width, height: height };
}

function generateModuleParts(assembly, module, profile, rules, issues) {
  var parts = [];
  var carcass = profile.materials.carcass;
  var back = profile.materials.back;
  var edge = profile.materials.edge_default;
  var q = quantity(module);
  var width = module.width_mm;
  var height = module.height_mm;
  var depth = moduleDepth(module, assembly, profile);
  if (module.module_type === 'WALL_CABINET') depth -= rules.dimensions.wall_depth_reduction_mm;
  var horizontalWidth = width - rules.dimensions.horizontal_width_reduction_mm;
  var horizontalDepth = depth - rules.dimensions.rear_clearance_mm;
  var sideDepth = horizontalDepth;
  var className = moduleClass(module);
  var panelSource = sourceRule('CARCASS_PANELS_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.woodworkingShop, 'Explicit module width/height/depth drive the panel geometry.');
  var sideSource = sourceRule('SIDE_PANEL_FROM_MODULE_DIMENSIONS_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.woodworkingShop, 'Two side panels use the explicit module height and depth.');
  var horizontalSource = sourceRule('HORIZONTAL_PANEL_FROM_MODULE_DIMENSIONS_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.woodworkingShop, 'Horizontal width is module width minus the profile inset; panel count is construction-profile data.');
  var backSource = sourceRule('BACK_PANEL_TALL_ONLY_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalBackPolicy, 'Back panel is generated only for tall carcasses in this alpha profile.');
  var edgeSource = sourceRule('ALPHA_EDGE_EXPOSURE_POLICY_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalEdgePolicy, 'Only configured visible edge sides are emitted; production exposure policy remains out of scope.');

  if (!positiveNumber(width) || !positiveNumber(height) || !positiveNumber(depth)) {
    issues.push(issue('MODULE_DIMENSIONS_INVALID', 'VALIDATION_ERROR', 'Module dimensions must be positive and resolvable.', 'assemblies[].modules[' + module.id + ']'));
    return parts;
  }
  if (!positiveNumber(horizontalWidth) || !positiveNumber(horizontalDepth)) {
    issues.push(issue('DERIVED_PANEL_DIMENSION_INVALID', 'VALIDATION_ERROR', 'Profile reductions leave no usable panel size.', 'assemblies[].modules[' + module.id + ']'));
    return parts;
  }

  addPart(parts, module, 'LEFT_SIDE', q, height, sideDepth, carcass.thickness_mm, carcass.material_code, rules.edge.carcass_visible_sides, sideSource, {
    Notches: isBaseLike(module) ? [{ type: 'TOE_KICK_CLEARANCE', height_mm: profile.global_dimensions && profile.global_dimensions.toe_kick_height_mm || null, status: 'PROVISIONAL_ALPHA' }] : []
  }, undefined, edgeSource);
  addPart(parts, module, 'RIGHT_SIDE', q, height, sideDepth, carcass.thickness_mm, carcass.material_code, rules.edge.carcass_visible_sides, sideSource, {
    Notches: isBaseLike(module) ? [{ type: 'TOE_KICK_CLEARANCE', height_mm: profile.global_dimensions && profile.global_dimensions.toe_kick_height_mm || null, status: 'PROVISIONAL_ALPHA' }] : []
  }, undefined, edgeSource);

  var horizontalCount = className === 'wall' ? 0 : className === 'tall' ? 2 : 1;
  if (horizontalCount >= 1) {
    addPart(parts, module, 'BOTTOM', q, horizontalWidth, horizontalDepth, carcass.thickness_mm, carcass.material_code, rules.edge.carcass_visible_sides, horizontalSource, {
      Grooves: []
    }, undefined, edgeSource);
  }
  if (horizontalCount >= 2) {
    addPart(parts, module, 'TOP', q, horizontalWidth, horizontalDepth, carcass.thickness_mm, carcass.material_code, rules.edge.carcass_visible_sides, horizontalSource, {
      Grooves: []
    }, undefined, edgeSource);
  }

  if (module.role === 'WALL_STORAGE' || module.role === 'GENERAL_STORAGE' || module.role === 'UNKNOWN') {
    issues.push(issue('SHELF_COUNT_INPUT_GAP', 'INPUT_GAP', 'The confirmed contract has no shelf count or shelf dimensions; no shelves were synthesized.', 'assemblies[].modules[' + module.id + ']'));
  }

  if (className === 'tall') {
    var backWidth = width - rules.dimensions.horizontal_width_reduction_mm;
    var toeKickHeight = profile.global_dimensions && positiveNumber(profile.global_dimensions.toe_kick_height_mm) ? profile.global_dimensions.toe_kick_height_mm : 0;
    var backHeight = height - toeKickHeight - rules.dimensions.back_panel_top_clearance_mm;
    addPart(parts, module, 'BACK', q, backHeight, backWidth, back.thickness_mm, back.material_code, rules.edge.back_visible_sides, backSource, {
      Grooves: [{ type: 'BACK_PANEL_RECESS', depth_mm: back.thickness_mm, status: 'PROVISIONAL_ALPHA' }]
    });
  } else if (module.role === 'REFRIGERATOR_HOUSING' || module.role === 'APPLIANCE_TOWER') {
    issues.push(issue('BACK_MODE_NOT_ESTABLISHED', 'NOT_IMPLEMENTED', 'Back construction mode is excluded from alpha authority; no back panel was generated for this non-tall module.', 'assemblies[].modules[' + module.id + ']'));
  }

  if (Array.isArray(module.fronts)) {
    module.fronts.forEach(function (front, index) {
      var facade = facadeDimensions(module, front, rules);
      if (!facade) {
        issues.push(issue('FACADE_DIMENSIONS_MISSING', 'INPUT_GAP', 'Facade width and height are required; this front was not synthesized.', 'assemblies[].modules[' + module.id + '].fronts[' + index + ']'));
        return;
      }
      var facadeSource = sourceRule('FACADE_EXPLICIT_DIMENSIONS_V1', 'CONFIRMED', {
        Repository: 'confirmed-configuration-v1 input',
        Commit: null,
        Source_path: 'fronts[]',
        Source_function_or_logic: 'explicit width_mm/height_mm',
        Adaptation: 'No facade dimensions are inferred when the contract contains null.'
      }, 'Only explicit facade dimensions are used.');
      addPart(parts, module, 'FACADE', q * facade.count, facade.width, facade.height, carcass.thickness_mm, carcass.material_code, rules.edge.facade_visible_sides, facadeSource, {
        Holes: front.kind === 'HINGED_DOOR' ? [{ type: 'HINGE_CUP', count: hingeCount(facade.height, rules), status: 'PROVISIONAL_ALPHA' }] : [],
        Joinery: []
      }, undefined, edgeSource);
    });
  }

  if (isDrawerModule(module)) {
    var drawerFronts = module.fronts ? module.fronts.filter(function (front) { return front.kind === 'DRAWER_FRONT'; }) : [];
    if (drawerFronts.length === 0) {
      issues.push(issue('DRAWER_FRONT_DIMENSIONS_MISSING', 'INPUT_GAP', 'Drawer fronts have no explicit dimensions; drawer parts were not synthesized.', 'assemblies[].modules[' + module.id + '].fronts'));
    }
    if (drawerFronts.length > 0 && drawerFronts.some(function (front) { return !positiveNumber(front.height_mm); })) {
      issues.push(issue('DRAWER_BOX_DIMENSIONS_MISSING', 'INPUT_GAP', 'Drawer front heights are required before generating drawer boxes.', 'assemblies[].modules[' + module.id + '].fronts'));
    } else if (drawerFronts.length > 0) {
      drawerFronts.forEach(function (front, index) {
        var drawerWidth = positiveNumber(front.width_mm) ? front.width_mm - rules.dimensions.drawer_side_clearance_mm * 2 : width - rules.dimensions.drawer_side_clearance_mm * 2;
        var drawerHeight = front.height_mm - rules.dimensions.drawer_box_height_reduction_mm;
        var drawerDepth = depth - rules.dimensions.drawer_box_depth_reduction_mm;
        var drawerSource = sourceRule('DRAWER_BOX_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalDrawerProvision, 'Compact base drawer model; vendor clearances remain provisional.');
        addPart(parts, module, 'DRAWER_SIDE', q * 2 * front.count, drawerDepth, drawerHeight, carcass.thickness_mm, carcass.material_code, [], drawerSource, {});
        addPart(parts, module, 'DRAWER_FRONT_BOX', q * front.count, drawerWidth, drawerHeight, carcass.thickness_mm, carcass.material_code, [], drawerSource, {});
        addPart(parts, module, 'DRAWER_BACK_BOX', q * front.count, drawerWidth, drawerHeight, carcass.thickness_mm, carcass.material_code, [], drawerSource, {});
        addPart(parts, module, 'DRAWER_BOTTOM', q * front.count, drawerDepth - rules.dimensions.drawer_box_bottom_clearance_mm, drawerWidth - rules.dimensions.drawer_box_bottom_clearance_mm, back.thickness_mm, back.material_code, [], drawerSource, {});
      });
    }
  }

  return parts;
}

function generateParts(input, profile, rules, issues) {
  var parts = [];
  input.assemblies.forEach(function (assembly) {
    (assembly.modules || []).forEach(function (module) {
      var generated = generateModuleParts(assembly, module, {
        materials: profile.materials,
        dimension_defaults: profile.dimension_defaults,
        global_dimensions: input.global_dimensions || {}
      }, rules, issues);
      generated.forEach(function (item) { parts.push(item); });
    });
  });
  return parts;
}

function partArea(partItem) {
  return partItem.Length_mm * partItem.Width_mm * partItem.Qty / 1000000;
}

function edgeLength(partItem, side) {
  if (side === 'front' || side === 'back' || side === 'top' || side === 'bottom') return partItem.Length_mm;
  return partItem.Width_mm;
}

function aggregateMaterials(parts) {
  var map = {};
  parts.forEach(function (item) {
    if (!map[item.Material_code]) map[item.Material_code] = { material_code: item.Material_code, area_m2: 0, part_qty: 0 };
    map[item.Material_code].area_m2 += partArea(item);
    map[item.Material_code].part_qty += item.Qty;
  });
  return Object.keys(map).sort().map(function (key) {
    var item = map[key];
    item.area_m2 = Math.round(item.area_m2 * 1000000) / 1000000;
    return item;
  });
}

function aggregateByComponent(parts, aggregateFn) {
  var components = {};
  parts.forEach(function (item) {
    var component = item.Component || 'CARCASS';
    if (!components[component]) components[component] = [];
    components[component].push(item);
  });
  return Object.keys(components).sort().map(function (component) {
    return { Component: component, items: aggregateFn(components[component]) };
  });
}

function aggregatePartCounts(parts) {
  var map = {};
  parts.forEach(function (item) {
    var component = item.Component || 'CARCASS';
    if (!map[component]) map[component] = 0;
    map[component] += item.Qty;
  });
  return Object.keys(map).sort().map(function (component) {
    return { Component: component, part_qty: map[component] };
  });
}

function aggregateEdges(parts, profile) {
  var map = {};
  parts.forEach(function (item) {
    var edgeCode = item.Edge_sides.length ? profile.materials.edge_default.material_code : null;
    if (!edgeCode) return;
    if (!map[edgeCode]) map[edgeCode] = { material_code: edgeCode, length_m: 0, edge_count: 0 };
    item.Edge_sides.forEach(function (side) {
      map[edgeCode].length_m += edgeLength(item, side) * item.Qty / 1000;
      map[edgeCode].edge_count += item.Qty;
    });
  });
  return Object.keys(map).sort().map(function (key) {
    var item = map[key];
    item.length_m = Math.round(item.length_m * 1000000) / 1000000;
    return item;
  });
}

function facadeArea(parts) {
  return parts.filter(function (item) { return item.Part_type === 'FACADE'; }).reduce(function (sum, item) { return sum + partArea(item); }, 0);
}

function aggregateFeatures(parts) {
  var result = { Holes: 0, Grooves: 0, Notches: 0, Joinery: 0 };
  parts.forEach(function (item) {
    result.Holes += item.Holes.length * item.Qty;
    result.Grooves += item.Grooves.length * item.Qty;
    result.Notches += item.Notches.length * item.Qty;
    result.Joinery += item.Joinery.length * item.Qty;
  });
  return result;
}

function hardwareItem(itemCode, quantityValue, unit, status, source, note) {
  return {
    item: itemCode,
    quantity: quantityValue,
    unit: unit,
    status: status,
    source_rule: clone(source),
    note: note || null
  };
}

function aggregateHardware(input, parts, profile, rules, issues) {
  var hardware = [];
  var hingeSource = sourceRule('HINGE_COUNT_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.woodworkingShopHinge, 'Height threshold copied as a reference; front dimensions are required.');
  var plateSource = sourceRule('MOUNTING_PLATE_PER_HINGE_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalMountingPlateProvision, 'One mounting plate per hinge is a local alpha assumption.');
  var baseSource = sourceRule('BASE_MODULE_HARDWARE_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalBaseHardwareProvision, 'Fixed quantities are alpha structural assumptions, not Basis calibration.');
  var dowelSource = sourceRule('DOWEL_COUNT_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalDowelProvision, 'One fixed alignment set per physical carcass module.');
  var confirmatSource = sourceRule('CONFIRMAT_COUNT_ALPHA_V1', 'PROVISIONAL_ALPHA', ALPHA_PROVENANCE.alphaLocalFastenerProvision, 'Eight fasteners per physical carcass module.');
  var physicalModuleCount = 0;
  input.assemblies.forEach(function (assembly) {
    (assembly.modules || []).forEach(function (module) {
      var q = quantity(module);
      physicalModuleCount += q;
      var visibleHinged = (module.fronts || []).filter(function (front) { return front.kind === 'HINGED_DOOR' && positiveNumber(front.height_mm); });
      visibleHinged.forEach(function (front) {
        var hinges = hingeCount(front.height_mm, rules) * front.count * q;
        hardware.push(hardwareItem('HINGES', hinges, 'pcs', 'PROVISIONAL_ALPHA', hingeSource, 'Hinge threshold rule is not alpha-authoritative.'));
        hardware.push(hardwareItem('MOUNTING_PLATES', hinges, 'pcs', 'PROVISIONAL_ALPHA', plateSource, null));
      });
      if (visibleHinged.length && visibleHinged.some(function (front) { return !positiveNumber(front.height_mm); })) {
        issues.push(issue('HINGE_COUNT_INPUT_GAP', 'INPUT_GAP', 'Hinge count cannot be derived for a front without explicit height.', 'assemblies[].modules[' + module.id + '].fronts'));
      }
    });
  });
  var baseCount = input.assemblies.reduce(function (sum, assembly) {
    return sum + (assembly.modules || []).filter(isBaseLike).reduce(function (moduleSum, module) { return moduleSum + quantity(module); }, 0);
  }, 0);
  if (baseCount > 0) {
    hardware.push(hardwareItem('LEGS', baseCount * rules.hardware.legs_per_base_module, 'pcs', 'PROVISIONAL_ALPHA', baseSource, 'Four legs per base-like module.'));
    hardware.push(hardwareItem('PLINTH_CLIPS', baseCount * rules.hardware.plinth_clips_per_base_module, 'pcs', 'PROVISIONAL_ALPHA', baseSource, 'Two plinth clips per base-like module.'));
  }
  if (physicalModuleCount > 0) {
    hardware.push(hardwareItem('DOWELS_8x30', physicalModuleCount * rules.hardware.dowels_per_carcass_module, 'pcs', 'PROVISIONAL_ALPHA', dowelSource, 'Count is structural alpha baseline, not a vendor drilling plan.'));
    hardware.push(hardwareItem('CONFIRMATS_7x50', physicalModuleCount * rules.hardware.confirmats_per_carcass_module, 'pcs', 'PROVISIONAL_ALPHA', confirmatSource, 'Count is structural alpha baseline.'));
  }
  hardware.push(hardwareItem('DRAWER_MECHANISMS', null, 'sets', 'NOT_IMPLEMENTED', sourceRule('DRAWER_VENDOR_RULE_REQUIRED_V1', 'NOT_IMPLEMENTED', ALPHA_PROVENANCE.alphaLocalDrawerMechanismGap, 'Vendor drawer system and clearances are not present in the contract.'), 'Drawer fronts without vendor data do not receive a guessed mechanism count.'));
  return hardware;
}

function benchmarkValue(metric, golden, generated, classification, explanation) {
  var delta = generated === null ? null : generated - golden;
  var relative = generated === null || golden === 0 ? null : delta / golden * 100;
  return {
    metric: metric,
    golden: golden,
    generated: generated,
    absolute_delta: delta === null ? null : Math.round(delta * 1000000) / 1000000,
    relative_delta_pct: relative === null ? null : Math.round(relative * 1000000) / 1000000,
    classification: classification,
    explanation: explanation
  };
}

function benchmark(parts, reference) {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
    throw new Error('Benchmark reference must be an object.');
  }
  if (!Array.isArray(reference.metrics) || !reference.material_code_mapping || !reference.targets) {
    throw new Error('Benchmark reference must define metrics, material_code_mapping, and targets.');
  }
  var componentMaterials = aggregateByComponent(parts, aggregateMaterials);
  var edgeCode = reference.material_code_mapping.EDGE;
  var componentEdges = aggregateByComponent(parts, function (items) {
    return aggregateEdges(items, { materials: { edge_default: { material_code: edgeCode } } });
  });
  function scopedItems(groups, components) {
    var selected = groups.filter(function (group) {
      return !Array.isArray(components) || components.indexOf(group.Component) !== -1;
    });
    return selected.reduce(function (all, group) { return all.concat(group.items); }, []);
  }
  function valueForMetric(metric) {
    var groups = metric.dataset === 'edges' ? componentEdges : componentMaterials;
    var items = scopedItems(groups, metric.components);
    var code = reference.material_code_mapping[metric.material_key];
    return items.filter(function (item) { return item.material_code === code; }).reduce(function (sum, item) {
      return sum + item[metric.field];
    }, 0);
  }
  return {
    reference_id: reference.reference_id || null,
    aggregates: reference.metrics.map(function (metric) {
      if (!metric || typeof metric.metric !== 'string' || typeof metric.target_key !== 'string' || typeof metric.material_key !== 'string' || typeof metric.dataset !== 'string' || typeof metric.field !== 'string') {
        throw new Error('Benchmark reference contains an invalid metric definition.');
      }
      var target = reference.targets[metric.target_key];
      if (typeof target !== 'number' || !Number.isFinite(target)) {
        throw new Error('Benchmark reference target is missing for ' + metric.target_key + '.');
      }
      var requiredPartPresent = !metric.requires_part_type || parts.some(function (item) { return item.Part_type === metric.requires_part_type; });
      var generated = valueForMetric(metric);
      var classification = metric.classification || 'PROVISIONAL_ALPHA_RULE';
      if (!requiredPartPresent) {
        generated = 0;
        classification = metric.classification_when_missing || 'INPUT_GAP';
      }
      return benchmarkValue(metric.metric, target, generated, classification, metric.explanation || null);
    }),
    notes: Array.isArray(reference.notes) ? clone(reference.notes) : []
  };
}

function calculateConstructionCore(input, profile, benchmarkReference) {
  var loadedProfile = loadConstructionProfile(profile);
  assertValidatedInput(input, loadedProfile);
  var issues = [];
  var rules = clone(RULES);
  rules.dimension_defaults = clone(loadedProfile.dimension_defaults);
  var parts = generateParts(input, loadedProfile, rules, issues);
  if (issues.some(function (item) { return item.status === 'VALIDATION_ERROR'; })) {
    var error = new Error('Construction Core calculation blocked by validation error.');
    error.code = 'VALIDATION_ERROR';
    error.issues = issues;
    throw error;
  }
  var materials = aggregateMaterials(parts);
  var materialsByComponent = aggregateByComponent(parts, aggregateMaterials);
  var edges = aggregateEdges(parts, loadedProfile);
  var edgesByComponent = aggregateByComponent(parts, function (items) { return aggregateEdges(items, loadedProfile); });
  var manufacturingFeatures = aggregateFeatures(parts);
  var hardware = aggregateHardware(input, parts, loadedProfile, rules, issues);
  var result = {
    Project: {
      project_id: input.project_id,
      schema_version: input.schema_version,
      construction_profile_id: input.construction_profile_id,
      status: input.status,
      units: input.units
    },
    Parts: parts,
    Materials: materials,
    Materials_by_component: materialsByComponent,
    Edge: edges,
    Edge_by_component: edgesByComponent,
    Part_count_by_component: aggregatePartCounts(parts),
    Hardware: hardware,
    Manufacturing_features: manufacturingFeatures,
    Issues: issues,
    Benchmark: null
  };
  result.Benchmark = benchmarkReference === undefined || benchmarkReference === null ? null : benchmark(parts, benchmarkReference);
  return result;
}

var ConstructionCore = {
  ALPHA_PROVENANCE: ALPHA_PROVENANCE,
  RULES: RULES,
  loadConstructionProfile: loadConstructionProfile,
  calculateConstructionCore: calculateConstructionCore,
  partArea: partArea,
  aggregateMaterials: aggregateMaterials,
  aggregateEdges: aggregateEdges,
  facadeArea: facadeArea,
  aggregateByComponent: aggregateByComponent,
  aggregatePartCounts: aggregatePartCounts
};

if (typeof module !== 'undefined' && module.exports) module.exports = ConstructionCore;
