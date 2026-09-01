/** GENERATED from canonical active V1 require graph. Build: 1a4dced17dbf796d383bd72937d6119b5dfd5b3287c8dd8a7bea1e71faf50332 */
var ACTIVE_V1_RUNTIME_BUILD = '1a4dced17dbf796d383bd72937d6119b5dfd5b3287c8dd8a7bea1e71faf50332';
var ACTIVE_V1_RUNTIME = (function(){
  var factories_ = {}, cache_ = {};
  function define_(id, factory){ factories_[id] = factory; }
  function resolve_(from, request){
    var parts = from.split('/'); parts.pop();
    request.split('/').forEach(function(part){ if (!part || part === '.') return; if (part === '..') parts.pop(); else parts.push(part); });
    var value = parts.join('/'); if (value.slice(-3) !== '.js') value += '.js'; return value.charAt(0) === '/' ? value : '/' + value;
  }
  function require_(id){
    if (cache_[id]) return cache_[id].exports; if (!factories_[id]) throw new Error('Module not bundled: ' + id);
    var module = {exports:{}}; cache_[id] = module; factories_[id](module, module.exports, function(request){ return require_(resolve_(id, request)); }); return module.exports;
  }

  define_("/src/construction-core/index.js", function(module, exports, require) {
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
    
  });

  define_("/src/costing/index.js", function(module, exports, require) {
    /**
     * Costing and BOM V1 deterministic calculation engine.
     *
     * Pipeline: Construction Core result + Prices -> Price Snapshot -> Costing -> BOM bundle
     * -> BOM_LAST / CALC_LOG / SYSTEM rows.
     *
     * Pure ECMAScript - no external dependencies, no network calls, no input mutations.
     */
    
    var PRICE_CATEGORIES = ['MATERIALS', 'EDGE', 'HARDWARE', 'WORKS', 'OTHER'];
    
    /**
     * Deep clone an object or array.
     */
    function deepClone(obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(deepClone);
      }
      var copy = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i += 1) {
        copy[keys[i]] = deepClone(obj[keys[i]]);
      }
      return copy;
    }
    
    /**
     * Deep freeze an object or array.
     */
    function deepFreeze(obj) {
      if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
        return obj;
      }
      Object.freeze(obj);
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i += 1) {
        deepFreeze(obj[keys[i]]);
      }
      return obj;
    }
    
    /**
     * Deterministically sort object keys for JSON serialization.
     */
    function sortKeys(obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }
      var sorted = {};
      var keys = Object.keys(obj).sort();
      for (var i = 0; i < keys.length; i += 1) {
        sorted[keys[i]] = sortKeys(obj[keys[i]]);
      }
      return sorted;
    }
    
    function stableJsonStringify(obj) {
      if (obj === undefined) {
        return null;
      }
      return JSON.stringify(sortKeys(obj));
    }
    
    /**
     * Round a number to 6 decimal places for deterministic precision.
     */
    function round6(val) {
      if (typeof val !== 'number' || isNaN(val)) return 0;
      return Math.round(val * 1000000) / 1000000;
    }
    
    /**
     * Round a currency amount to 2 decimal places.
     */
    function round2(val) {
      if (typeof val !== 'number' || isNaN(val)) return 0;
      return Math.round(val * 100) / 100;
    }
    
    function isActiveRow(row) {
      return row.active === true || row.active === 'TRUE' || row.active === 'true' || row.active === 1;
    }
    
    function fxRateFor(fromCurrency, targetCurrency, fxRates) {
      if (!fromCurrency || !targetCurrency) {
        throw new Error('Currency codes are required for FX conversion.');
      }
      if (fromCurrency === targetCurrency) {
        return 1;
      }
      var pairKey = fromCurrency + '/' + targetCurrency;
      if (fxRates && typeof fxRates[pairKey] === 'number' && fxRates[pairKey] > 0) {
        return fxRates[pairKey];
      }
      throw new Error('Missing FX rate for ' + pairKey + '; no network rate lookup is allowed.');
    }
    
    /**
     * Build an immutable price snapshot from Prices sheet rows (PRICES_V1 contract).
     *
     * Only active rows are included. Prices are converted to numbers; currency and
     * unit are preserved; FX conversion to targetCurrency uses only the supplied
     * FxRates map and throws when a required rate is missing.
     *
     * @param {Array<Object>} priceRows - rows matching the PRICES_V1 contract
     * @param {Object} [options] - { created_at, TargetCurrency, FxRates }
     * @returns {Object} Immutable price snapshot
     */
    function buildPriceSnapshot(priceRows, options) {
      if (!Array.isArray(priceRows)) {
        throw new Error('buildPriceSnapshot: priceRows must be an array');
      }
      var opts = options || {};
      var createdAt = opts.created_at || opts.Created_at || null;
      var targetCurrency = opts.TargetCurrency || opts.targetCurrency || opts.target_currency || null;
      var fxRates = opts.FxRates || opts.fxRates || opts.fx_rates || {};
      var normalizedTarget = targetCurrency ? String(targetCurrency).toUpperCase() : null;
    
      var activeItems = [];
      for (var i = 0; i < priceRows.length; i += 1) {
        var row = priceRows[i];
        if (!row || typeof row !== 'object') continue;
        if (!isActiveRow(row)) continue;
    
        var numPrice = Number(row.price);
        if (isNaN(numPrice) || numPrice < 0) {
          throw new Error('buildPriceSnapshot: invalid price for item ' + (row.item_id || row.name));
        }
    
        var itemCurrency = String(row.currency || '').toUpperCase();
        var fxRateUsed = normalizedTarget ? fxRateFor(itemCurrency, normalizedTarget, fxRates) : 1;
    
        activeItems.push({
          item_id: String(row.item_id || '').trim(),
          category: String(row.category || '').trim(),
          name: String(row.name || '').trim(),
          unit: String(row.unit || '').trim(),
          price: numPrice,
          currency: itemCurrency,
          vendor: row.vendor ? String(row.vendor).trim() : null,
          article: row.article ? String(row.article).trim() : null,
          active: true,
          notes: row.notes ? String(row.notes).trim() : null,
          updated_at: row.updated_at || null,
          fx_rate_used: fxRateUsed,
          converted_price: round6(numPrice * fxRateUsed)
        });
      }
    
      var byItemId = {};
      var byArticle = {};
      for (var j = 0; j < activeItems.length; j += 1) {
        var item = activeItems[j];
        if (item.item_id) {
          byItemId[item.item_id] = item;
        }
        if (item.article) {
          if (!byArticle[item.article]) byArticle[item.article] = [];
          byArticle[item.article].push(item);
        }
      }
    
      var snapshot = {
        created_at: createdAt,
        target_currency: normalizedTarget,
        fx_rates: deepClone(fxRates),
        items: activeItems,
        by_item_id: byItemId,
        by_article: byArticle
      };
    
      return deepFreeze(snapshot);
    }
    
    /**
     * Resolve a price item deterministically.
     *
     * Priority:
     * 1. explicit stable identifier present on both sides (item_id);
     * 2. exact article code if unambiguous (optionally narrowed by category);
     * 3. exact category + code/name composite key if unambiguous.
     *
     * No fuzzy name matching. Ambiguous or missing matches return null.
     *
     * @param {Object} query - { code, category }
     * @param {Object} snapshot - price snapshot
     * @returns {Object|null} matched snapshot item or null
     */
    function resolvePriceItem(query, snapshot) {
      if (!snapshot || !Array.isArray(snapshot.items)) return null;
      var code = query.code ? String(query.code).trim() : '';
      var category = query.category ? String(query.category).trim().toUpperCase() : '';
      var name = query.name ? String(query.name).trim() : '';
    
      // 1. Explicit stable identifier match on item_id.
      if (code && snapshot.by_item_id && snapshot.by_item_id[code]) {
        return snapshot.by_item_id[code];
      }
    
      // 2. Exact article code match, unambiguous (optionally narrowed by category).
      if (code && snapshot.by_article && snapshot.by_article[code]) {
        var articleMatches = snapshot.by_article[code];
        var narrowed = category
          ? articleMatches.filter(function (m) { return m.category.toUpperCase() === category; })
          : articleMatches;
        if (narrowed.length === 1) {
          return narrowed[0];
        }
        return null;
      }
    
      // 3. Exact composite key: category + (item_id|article|name equals code or name).
      var candidateMatches = [];
      for (var i = 0; i < snapshot.items.length; i += 1) {
        var item = snapshot.items[i];
        if (category && item.category.toUpperCase() !== category) continue;
        if (code && (item.item_id === code || item.article === code)) {
          candidateMatches.push(item);
        } else if (name && item.name === name) {
          candidateMatches.push(item);
        }
      }
      if (candidateMatches.length === 1) {
        return candidateMatches[0];
      }
      return null;
    }
    
    function unresolvedLine(section, itemName, specification, materialCode, quantity, unit, reason) {
      return {
        Section: section,
        Item_name: itemName,
        Specification: specification || null,
        Material_code: materialCode || null,
        Quantity: quantity,
        Unit: unit,
        Reason: reason,
        Status: 'UNRESOLVED_PRICE'
      };
    }
    
    /**
     * Calculate costing from a Construction Core result and a price snapshot.
     *
     * Deterministic: same inputs always produce the same output. Lines without a
     * deterministic price key or without a quantity are reported as UNRESOLVED_PRICE
     * and never silently counted as zero. WORKS lines are only produced when the
     * construction result carries an explicit work quantity.
     *
     * @param {Object} constructionResult - output of calculateConstructionCore
     * @param {Object} priceSnapshot - output of buildPriceSnapshot
     * @param {Object} [options] - { TargetCurrency }
     * @returns {Object} Costing result
     */
    function calculateCosting(constructionResult, priceSnapshot, options) {
      if (!constructionResult || typeof constructionResult !== 'object') {
        throw new Error('calculateCosting: constructionResult must be an object');
      }
      if (!priceSnapshot || typeof priceSnapshot !== 'object') {
        throw new Error('calculateCosting: priceSnapshot must be an object');
      }
      var opts = options || {};
      var calculationCurrency = opts.TargetCurrency || opts.targetCurrency || priceSnapshot.target_currency ||
        (Array.isArray(priceSnapshot.items) && priceSnapshot.items.length > 0 ? priceSnapshot.items[0].currency : 'RUB');
    
      var pricedLines = [];
      var unresolvedLines = [];
      var materialTotal = 0;
      var edgeTotal = 0;
      var hardwareTotal = 0;
      var workTotal = 0;
    
      function addPricedLine(section, quantity, priceItem, lineDefaults) {
        var unitPrice = priceItem.converted_price;
        var lineTotal = round2(quantity * unitPrice);
        pricedLines.push({
          Section: section,
          Item_name: priceItem.name || lineDefaults.fallbackName,
          Specification: priceItem.article || lineDefaults.specification || null,
          Size: lineDefaults.size || null,
          Quantity: typeof quantity === 'number' && Number.isInteger(quantity) ? quantity : round6(quantity),
          Unit: priceItem.unit || lineDefaults.unit,
          Unit_price: unitPrice,
          Total: lineTotal,
          Source_module: lineDefaults.source_module || null,
          Item_id: priceItem.item_id,
          Module_id: lineDefaults.module_id || null,
          Material_code: lineDefaults.material_code || null,
          Price_currency: priceItem.currency,
          Fx_rate_used: priceItem.fx_rate_used
        });
        return lineTotal;
      }
    
      // 1. Materials (aggregated panel materials priced per m2 by material_code).
      var materials = Array.isArray(constructionResult.Materials) ? constructionResult.Materials : [];
      for (var m = 0; m < materials.length; m += 1) {
        var mat = materials[m];
        var matCode = mat.material_code || '';
        var matArea = typeof mat.area_m2 === 'number' ? mat.area_m2 : null;
        if (matArea === null || matArea <= 0) {
          unresolvedLines.push(unresolvedLine('MATERIALS', matCode || 'Unknown material', matCode, matCode, matArea, 'm2', 'INVALID_QUANTITY'));
          continue;
        }
        var matPrice = resolvePriceItem({ code: matCode, category: 'MATERIALS' }, priceSnapshot);
        if (!matPrice) {
          unresolvedLines.push(unresolvedLine('MATERIALS', matCode, matCode, matCode, matArea, 'm2', 'PRICE_NOT_FOUND'));
          continue;
        }
        materialTotal += addPricedLine('MATERIALS', matArea, matPrice, {
          fallbackName: matCode,
          specification: matCode,
          unit: 'm2',
          material_code: matCode
        });
      }
    
      // 2. Edge banding (aggregated edge length priced per m by material_code).
      var edges = Array.isArray(constructionResult.Edge) ? constructionResult.Edge : [];
      for (var e = 0; e < edges.length; e += 1) {
        var edge = edges[e];
        var edgeCode = edge.material_code || '';
        var edgeLen = typeof edge.length_m === 'number' ? edge.length_m : null;
        if (edgeLen === null || edgeLen <= 0) {
          unresolvedLines.push(unresolvedLine('EDGE', edgeCode || 'Unknown edge', edgeCode, edgeCode, edgeLen, 'm', 'INVALID_QUANTITY'));
          continue;
        }
        var edgePrice = resolvePriceItem({ code: edgeCode, category: 'EDGE' }, priceSnapshot);
        if (!edgePrice) {
          unresolvedLines.push(unresolvedLine('EDGE', edgeCode, edgeCode, edgeCode, edgeLen, 'm', 'PRICE_NOT_FOUND'));
          continue;
        }
        edgeTotal += addPricedLine('EDGE', edgeLen, edgePrice, {
          fallbackName: edgeCode,
          specification: edgeCode,
          unit: 'm',
          material_code: edgeCode
        });
      }
    
      // 3. Hardware (per-item quantities priced by item code).
      var hardwareList = Array.isArray(constructionResult.Hardware) ? constructionResult.Hardware : [];
      for (var h = 0; h < hardwareList.length; h += 1) {
        var hw = hardwareList[h];
        var hwCode = hw.item || '';
        var hwQty = typeof hw.quantity === 'number' ? hw.quantity : null;
        var hwUnit = hw.unit || 'pcs';
        if (hwQty === null || hwQty <= 0) {
          unresolvedLines.push(unresolvedLine('HARDWARE', hwCode || 'Unknown hardware', hwCode, null, hwQty, hwUnit, hwQty === null ? 'QUANTITY_NULL' : 'INVALID_QUANTITY'));
          continue;
        }
        var hwPrice = resolvePriceItem({ code: hwCode, category: 'HARDWARE' }, priceSnapshot);
        if (!hwPrice) {
          unresolvedLines.push(unresolvedLine('HARDWARE', hwCode, hwCode, null, hwQty, hwUnit, 'PRICE_NOT_FOUND'));
          continue;
        }
        hardwareTotal += addPricedLine('HARDWARE', hwQty, hwPrice, {
          fallbackName: hwCode,
          specification: hwCode,
          unit: hwUnit
        });
      }
    
      // 4. Works: only priced when the construction result provides an explicit
      // works list with quantities; no fabricated WORKS lines are created.
      var worksList = Array.isArray(constructionResult.Works) ? constructionResult.Works : [];
      for (var w = 0; w < worksList.length; w += 1) {
        var work = worksList[w];
        var workCode = work.item || work.work_code || '';
        var workQty = typeof work.quantity === 'number' ? work.quantity : null;
        var workUnit = work.unit || 'pcs';
        if (workQty === null || workQty <= 0) {
          unresolvedLines.push(unresolvedLine('WORKS', workCode || 'Unknown work', workCode, null, workQty, workUnit, workQty === null ? 'QUANTITY_NULL' : 'INVALID_QUANTITY'));
          continue;
        }
        var workPrice = resolvePriceItem({ code: workCode, category: 'WORKS' }, priceSnapshot);
        if (!workPrice) {
          unresolvedLines.push(unresolvedLine('WORKS', workCode, workCode, null, workQty, workUnit, 'PRICE_NOT_FOUND'));
          continue;
        }
        workTotal += addPricedLine('WORKS', workQty, workPrice, {
          fallbackName: workCode,
          specification: workCode,
          unit: workUnit
        });
      }
    
      var status = unresolvedLines.length === 0 ? 'COMPLETE' : 'PARTIAL';
    
      return {
        Calculation_currency: calculationCurrency,
        Status: status,
        Priced_lines: pricedLines,
        Unresolved_lines: unresolvedLines,
        Totals: {
          Material_total: round2(materialTotal),
          Edge_total: round2(edgeTotal),
          Hardware_total: round2(hardwareTotal),
          Work_total: round2(workTotal),
          Grand_total: round2(materialTotal + edgeTotal + hardwareTotal + workTotal)
        }
      };
    }
    
    /**
     * Build the Sheets V1 bundle (BOM_LAST, CALC_LOG, SYSTEM) from a costing result.
     *
     * @param {Object} calculationContext - calculation_id, timestamp, project_name,
     *   manager, vision_model, status, app_version, schema_version,
     *   construction_profile_version, confirmed_configuration, construction_result
     * @param {Object} costingResult - output of calculateCosting
     * @param {Object} priceSnapshot - output of buildPriceSnapshot
     * @returns {Object} { BOM_LAST: Array<Object>, CALC_LOG: Object, SYSTEM: Array<Object> }
     */
    function buildSheetsV1Bundle(calculationContext, costingResult, priceSnapshot) {
      if (!calculationContext || typeof calculationContext !== 'object') {
        throw new Error('buildSheetsV1Bundle: calculationContext must be an object');
      }
      if (!costingResult || typeof costingResult !== 'object') {
        throw new Error('buildSheetsV1Bundle: costingResult must be an object');
      }
      if (!priceSnapshot || typeof priceSnapshot !== 'object') {
        throw new Error('buildSheetsV1Bundle: priceSnapshot must be an object');
      }
    
      var calcId = calculationContext.calculation_id || calculationContext.Calculation_id || null;
      if (!calcId) {
        throw new Error('buildSheetsV1Bundle: calculationContext.calculation_id is required');
      }
      var timestamp = calculationContext.timestamp || calculationContext.Timestamp || null;
      if (!timestamp) {
        throw new Error('buildSheetsV1Bundle: calculationContext.timestamp is required');
      }
      var projectName = calculationContext.project_name || calculationContext.Project_name || 'Unnamed project';
      var manager = calculationContext.manager || null;
      var visionModel = calculationContext.vision_model || calculationContext.Vision_model || null;
    
      var currency = costingResult.Calculation_currency || 'RUB';
      var totals = costingResult.Totals || {
        Material_total: 0,
        Edge_total: 0,
        Hardware_total: 0,
        Work_total: 0,
        Grand_total: 0
      };
      var costingStatus = costingResult.Status === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL';
    
      // --- BOM_LAST rows ---
      var bomRows = [];
      var pricedLines = Array.isArray(costingResult.Priced_lines) ? costingResult.Priced_lines : [];
      for (var i = 0; i < pricedLines.length; i += 1) {
        var line = pricedLines[i];
        bomRows.push({
          section: line.Section,
          item_name: line.Item_name,
          specification: line.Specification || '',
          size: line.Size || '',
          quantity: line.Quantity,
          unit: line.Unit,
          unit_price: line.Unit_price,
          total: line.Total,
          comment: '',
          source_module: line.Source_module || '',
          item_id: line.Item_id,
          module_id: line.Module_id || '',
          material_code: line.Material_code || '',
          calculation_id: calcId
        });
      }
    
      // TOTALS rows (contract BOM_LAST_V1 section enum includes TOTALS).
      var totalsRows = [
        { item_id: 'TOTAL_MATERIALS', item_name: 'Materials Total', value: totals.Material_total },
        { item_id: 'TOTAL_EDGE', item_name: 'Edge Total', value: totals.Edge_total },
        { item_id: 'TOTAL_HARDWARE', item_name: 'Hardware Total', value: totals.Hardware_total },
        { item_id: 'TOTAL_WORKS', item_name: 'Works Total', value: totals.Work_total },
        { item_id: 'TOTAL_GRAND', item_name: 'Grand Total', value: totals.Grand_total }
      ];
      for (var t = 0; t < totalsRows.length; t += 1) {
        var totalsRow = totalsRows[t];
        bomRows.push({
          section: 'TOTALS',
          item_name: totalsRow.item_name,
          specification: '',
          size: '',
          quantity: 1,
          unit: 'sum',
          unit_price: totalsRow.value,
          total: totalsRow.value,
          comment: '',
          source_module: '',
          item_id: totalsRow.item_id,
          module_id: '',
          material_code: '',
          calculation_id: calcId
        });
      }
    
      // --- CALC_LOG row ---
      // Contract status enum: DRAFT, CONFIRMED, COMPLETED, FAILED, ARCHIVED.
      var calcStatus = costingStatus === 'COMPLETE' ? 'COMPLETED' : 'CONFIRMED';
      if (calculationContext.status && ['DRAFT', 'CONFIRMED', 'COMPLETED', 'FAILED', 'ARCHIVED'].indexOf(calculationContext.status) !== -1) {
        calcStatus = calculationContext.status;
      }
    
      var fxRateUsed = 1;
      var items = Array.isArray(priceSnapshot.items) ? priceSnapshot.items : [];
      for (var k = 0; k < items.length; k += 1) {
        if (items[k].fx_rate_used !== 1) {
          fxRateUsed = items[k].fx_rate_used;
          break;
        }
      }
    
      var calcLogRow = {
        timestamp: timestamp,
        project_name: projectName,
        manager: manager,
        status: calcStatus,
        currency: currency,
        material_total: totals.Material_total,
        hardware_total: totals.Hardware_total,
        work_total: totals.Work_total,
        grand_total: totals.Grand_total,
        vision_model: visionModel,
        calculation_id: calcId,
        fx_rate_used: fxRateUsed
      };
    
      // --- SYSTEM rows ---
      var systemRows = [
        { Key: 'Calculation_id', Value: calcId, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Timestamp', Value: timestamp, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Status', Value: calcStatus, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Vision_model', Value: visionModel, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Currency', Value: currency, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Fx_rate_used', Value: fxRateUsed, Value_type: 'number', Updated_at: timestamp },
        { Key: 'Price_snapshot_created_at', Value: priceSnapshot.created_at || timestamp, Value_type: 'string', Updated_at: timestamp },
        { Key: 'Price_snapshot_json', Value: stableJsonStringify(snapshotForJson(priceSnapshot)), Value_type: 'json', Updated_at: timestamp }
      ];
    
      var appVersion = calculationContext.app_version || calculationContext.App_version;
      if (appVersion !== undefined && appVersion !== null) {
        systemRows.push({ Key: 'App_version', Value: String(appVersion), Value_type: 'string', Updated_at: timestamp });
      }
      var schemaVersion = calculationContext.schema_version || calculationContext.Schema_version;
      if (schemaVersion !== undefined && schemaVersion !== null) {
        systemRows.push({ Key: 'Schema_version', Value: String(schemaVersion), Value_type: 'string', Updated_at: timestamp });
      }
      var profileVersion = calculationContext.construction_profile_version || calculationContext.Construction_profile_version;
      if (profileVersion !== undefined && profileVersion !== null) {
        systemRows.push({ Key: 'Construction_profile_version', Value: String(profileVersion), Value_type: 'string', Updated_at: timestamp });
      }
      var confirmedConfig = calculationContext.confirmed_configuration || calculationContext.Confirmed_configuration;
      if (confirmedConfig !== undefined && confirmedConfig !== null) {
        systemRows.push({
          Key: 'Confirmed_configuration_json',
          Value: typeof confirmedConfig === 'string' ? confirmedConfig : stableJsonStringify(confirmedConfig),
          Value_type: 'json',
          Updated_at: timestamp
        });
      }
      var constructionRes = calculationContext.construction_result || calculationContext.Construction_result;
      if (constructionRes !== undefined && constructionRes !== null) {
        systemRows.push({
          Key: 'Construction_result_json',
          Value: typeof constructionRes === 'string' ? constructionRes : stableJsonStringify(constructionRes),
          Value_type: 'json',
          Updated_at: timestamp
        });
      }
    
      return {
        BOM_LAST: bomRows,
        CALC_LOG: calcLogRow,
        SYSTEM: systemRows
      };
    }
    
    /**
     * Extract a JSON-safe snapshot view (drops the lookup index maps).
     */
    function snapshotForJson(snapshot) {
      return {
        created_at: snapshot.created_at,
        target_currency: snapshot.target_currency,
        fx_rates: snapshot.fx_rates,
        items: snapshot.items
      };
    }
    
    var CostingV1 = {
      buildPriceSnapshot: buildPriceSnapshot,
      calculateCosting: calculateCosting,
      buildSheetsV1Bundle: buildSheetsV1Bundle,
      resolvePriceItem: resolvePriceItem,
      stableJsonStringify: stableJsonStringify
    };
    
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = CostingV1;
    }
  });

  define_("/src/input-understanding/confirmation.js", function(module, exports, require) {
    'use strict';
    
    function getStage10() {
      return require('./index.js');
    }
    
    function getFusion() {
      return require('./fusion.js');
    }
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function isNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }
    
    function isNonEmptyString(value) {
      return typeof value === 'string' && value.length > 0;
    }
    
    function issue(code, status, message, path, questionId) {
      var rec = {
        code: code,
        status: status,
        message: message,
        path: path || null,
        source_rule: null
      };
      if (questionId) {
        rec.question_id = questionId;
      }
      return rec;
    }
    
    function sanitizePathForId(targetPath) {
      var raw = String(targetPath || '').replace(/[^A-Za-z0-9]+/g, '_');
      raw = raw.replace(/^_+|_+$/g, '');
      return raw.length ? raw : 'root';
    }
    
    function compareTargetPath(a, b) {
      var pa = String(a.Target_path);
      var pb = String(b.Target_path);
      if (pa < pb) return -1;
      if (pa > pb) return 1;
      return 0;
    }
    
    function sortByTargetPath(arr) {
      return arr.slice().sort(compareTargetPath);
    }
    
    function compareQuestionId(a, b) {
      var qa = String(a.Question_id);
      var qb = String(b.Question_id);
      if (qa < qb) return -1;
      if (qa > qb) return 1;
      return 0;
    }
    
    function sortByQuestionId(arr) {
      return arr.slice().sort(compareQuestionId);
    }
    
    function stableSortQuestions(questions) {
      return questions.slice().sort(function (a, b) {
        var byPath = compareTargetPath(a, b);
        if (byPath !== 0) return byPath;
        return compareQuestionId(a, b);
      });
    }
    
    function buildDynamicBrief(clarificationResult) {
      var result = {
        Understood: [],
        Defaults_to_confirm: [],
        Questions: [],
        Conflicts: [],
        Blockers: []
      };
    
      if (!isPlainObject(clarificationResult)) {
        return result;
      }
    
      if (Array.isArray(clarificationResult.Understood)) {
        result.Understood = sortByTargetPath(
          clarificationResult.Understood.map(function (u) {
            return {
              Target_path: u.Target_path,
              Value: u.Value,
              Selected_evidence_id: u.Selected_evidence_id === undefined ? null : u.Selected_evidence_id
            };
          })
        );
      }
    
      if (Array.isArray(clarificationResult.Default_candidates)) {
        result.Defaults_to_confirm = sortByTargetPath(
          clarificationResult.Default_candidates.map(function (d) {
            return {
              Target_path: d.Target_path,
              Value: d.Value,
              Evidence_id: d.Evidence_id === undefined ? null : d.Evidence_id
            };
          })
        );
      }
    
      if (Array.isArray(clarificationResult.Questions)) {
        result.Questions = stableSortQuestions(
          clarificationResult.Questions.map(function (q) {
            var questionOptions = Array.isArray(q.Options) ? q.Options.slice() : [];
            if (questionOptions.length === 0 && q.Reason === 'CONFIRMATION_REQUIRED' && q.Default_value !== undefined && q.Default_value !== null) {
              questionOptions = [q.Default_value];
            }
            if (questionOptions.length === 0 && q.Reason === 'CONFIRMATION_REQUIRED' && Array.isArray(clarificationResult.Default_candidates)) {
              for (var d = 0; d < clarificationResult.Default_candidates.length; d += 1) {
                var candidate = clarificationResult.Default_candidates[d];
                if (candidate.Target_path === q.Target_path && candidate.Value !== undefined && candidate.Value !== null) {
                  questionOptions = [candidate.Value];
                  break;
                }
              }
            }
            return {
              Question_id: q.Question_id,
              Target_path: q.Target_path,
              Reason: q.Reason,
              Current_state: q.Current_state,
              Options: questionOptions,
              Default_value: q.Default_value === undefined ? null : q.Default_value,
              Default_source_ref: q.Default_source_ref === undefined ? null : q.Default_source_ref
            };
          })
        );
      }
    
      if (Array.isArray(clarificationResult.Conflicts)) {
        result.Conflicts = sortByTargetPath(
          clarificationResult.Conflicts.map(function (c) {
            var rec = {
              Target_path: c.Target_path,
              Options: Array.isArray(c.Options) ? c.Options.slice() : [],
              Evidence: Array.isArray(c.Evidence) ? c.Evidence.map(function (e) {
                return { Value: e.Value };
              }) : []
            };
            if (c.Source_ref !== undefined) rec.Source_ref = c.Source_ref;
            if (c.Source_type !== undefined) rec.Source_type = c.Source_type;
            if (c.Evidence_state !== undefined) rec.Evidence_state = c.Evidence_state;
            if (c.Note !== undefined) rec.Note = c.Note;
            return rec;
          })
        );
      }
    
      if (Array.isArray(clarificationResult.Blockers)) {
        result.Blockers = sortByTargetPath(
          clarificationResult.Blockers.map(function (b) {
            return {
              Target_path: b.Target_path,
              Reason: b.Reason
            };
          })
        );
      }
    
      return result;
    }
    
    function makeEvidenceRef(targetPath, value) {
      var valPart = isNumber(value) ? String(value) : 'v';
      return 'UC_' + sanitizePathForId(targetPath) + '_' + valPart;
    }
    
    function makeConfirmationEvidence(targetPath, value, sourceRef) {
      return {
        target_path: targetPath,
        value: value,
        source_type: 'USER_CONFIRMATION',
        confidence: 1.0,
        state: 'ACTIVE',
        source_ref: sourceRef
      };
    }
    
    function buildQuestionIndex(brief) {
      var index = {};
      if (!Array.isArray(brief.Questions)) {
        return index;
      }
      for (var i = 0; i < brief.Questions.length; i += 1) {
        var q = brief.Questions[i];
        if (!isNonEmptyString(q.Question_id)) {
          continue;
        }
        index[q.Question_id] = {
          question: q,
          index: i
        };
      }
      return index;
    }
    
    function collectConflictOptionsByPath(brief) {
      var map = {};
      if (!Array.isArray(brief.Conflicts)) {
        return map;
      }
      for (var i = 0; i < brief.Conflicts.length; i += 1) {
        var c = brief.Conflicts[i];
        map[c.Target_path] = Array.isArray(c.Options) ? c.Options.slice() : [];
      }
      return map;
    }
    
    function collectDefaultsByPath(brief) {
      var map = {};
      if (!Array.isArray(brief.Defaults_to_confirm)) {
        return map;
      }
      for (var i = 0; i < brief.Defaults_to_confirm.length; i += 1) {
        var d = brief.Defaults_to_confirm[i];
        map[d.Target_path] = d;
      }
      return map;
    }
    
    function validateAnswers(brief, answers) {
      var issues = [];
      if (!Array.isArray(answers)) {
        issues.push(issue('ANSWERS_INVALID', 'VALIDATION_ERROR', 'Answers must be an array.', '$'));
        return issues;
      }
    
      var questionIndex = buildQuestionIndex(brief);
      var conflictOptionsByPath = collectConflictOptionsByPath(brief);
      var defaultsByPath = collectDefaultsByPath(brief);
    
      var seenQuestionIds = {};
    
      for (var i = 0; i < answers.length; i += 1) {
        var pathBase = 'answers[' + i + ']';
        var ans = answers[i];
    
        if (!isPlainObject(ans)) {
          issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer must be an object.', pathBase));
          continue;
        }
    
        if (!isNonEmptyString(ans.Question_id)) {
          issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer requires a Question_id string.', pathBase + '.Question_id'));
          continue;
        }
    
        var entry = questionIndex[ans.Question_id];
        if (!entry) {
          issues.push(issue('UNKNOWN_QUESTION_ID', 'VALIDATION_ERROR', 'Question_id does not correspond to any brief question: ' + ans.Question_id, pathBase + '.Question_id', ans.Question_id));
          continue;
        }
    
        var question = entry.question;
    
        if (!isNonEmptyString(ans.Target_path)) {
          issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer requires a Target_path string.', pathBase + '.Target_path', ans.Question_id));
          continue;
        }
    
        if (ans.Target_path !== question.Target_path) {
          issues.push(issue('QUESTION_TARGET_MISMATCH', 'VALIDATION_ERROR', 'Answer Target_path does not match the question target_path. Question_id=' + ans.Question_id + ' expected ' + question.Target_path + ' got ' + ans.Target_path, pathBase + '.Target_path', ans.Question_id));
          continue;
        }
    
        if (!('Value' in ans) || ans.Value === undefined || ans.Value === null) {
          issues.push(issue('ANSWER_VALUE_MISSING', 'VALIDATION_ERROR', 'Answer Value is missing.', pathBase + '.Value', ans.Question_id));
          continue;
        }
    
        if (!isNumber(ans.Value) && question.Reason !== 'CONFIRMATION_REQUIRED') {
          issues.push(issue('ANSWER_VALUE_INVALID', 'VALIDATION_ERROR', 'Answer Value must be a finite number.', pathBase + '.Value', ans.Question_id));
          continue;
        }
    
        if (Object.prototype.hasOwnProperty.call(seenQuestionIds, ans.Question_id)) {
          issues.push(issue('DUPLICATE_QUESTION_ID', 'VALIDATION_ERROR', 'Duplicate Question_id in answers: ' + ans.Question_id, pathBase + '.Question_id', ans.Question_id));
          continue;
        }
        seenQuestionIds[ans.Question_id] = true;
    
        var options = question.Options;
        if (options && options.length > 0) {
          var matchedOption = false;
          for (var o = 0; o < options.length; o += 1) {
            if (options[o] === ans.Value) {
              matchedOption = true;
              break;
            }
          }
          if (!matchedOption) {
            issues.push(issue('ANSWER_VALUE_NOT_OPTION', 'VALIDATION_ERROR', 'Answer Value is not among the question options. Value=' + ans.Value + ' options=[' + options.join(', ') + ']', pathBase + '.Value', ans.Question_id));
            continue;
          }
        }
    
        var conflictOptions = conflictOptionsByPath[ans.Target_path];
        if (conflictOptions && conflictOptions.length > 0) {
          var matchedConflict = false;
          for (var co = 0; co < conflictOptions.length; co += 1) {
            if (conflictOptions[co] === ans.Value) {
              matchedConflict = true;
              break;
            }
          }
          if (!matchedConflict) {
            issues.push(issue('ANSWER_VALUE_NOT_CONFLICT_OPTION', 'VALIDATION_ERROR', 'Answer Value is not among the conflict options. Value=' + ans.Value + ' options=[' + conflictOptions.join(', ') + ']', pathBase + '.Value', ans.Question_id));
            continue;
          }
        }
    
        var dflt = defaultsByPath[ans.Target_path];
        if (dflt && question.Reason === 'CONFIRMATION_REQUIRED') {
          if (dflt.Value !== ans.Value) {
            issues.push(issue('ANSWER_VALUE_NOT_DEFAULT', 'VALIDATION_ERROR', 'Default confirmation answer must equal the default value. Default=' + dflt.Value + ' got ' + ans.Value, pathBase + '.Value', ans.Question_id));
            continue;
          }
        }
      }
    
      return issues;
    }
    
    function applyConfirmationAnswers(draft, brief, answers) {
      var stage10 = getStage10();
      var fusion = getFusion();
    
      var draftSnapshot = draft === null || draft === undefined ? null : JSON.stringify(draft);
      var briefSnapshot = brief === null || brief === undefined ? null : JSON.stringify(brief);
      var answersSnapshot = answers === null || answers === undefined ? null : JSON.stringify(answers);
    
      if (!isPlainObject(draft)) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: [issue('DRAFT_INVALID', 'VALIDATION_ERROR', 'Input draft must be a valid object.', '$')]
        };
      }
    
      if (!isPlainObject(brief)) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: [issue('BRIEF_INVALID', 'VALIDATION_ERROR', 'Input brief must be a valid object.', '$')]
        };
      }
    
      var validationIssues = validateAnswers(brief, answers);
      if (validationIssues.length > 0) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: validationIssues
        };
      }
    
      if (!Array.isArray(answers) || answers.length === 0) {
        var clonedEmpty = clone(draft);
        return {
          Ok: true,
          Draft: clonedEmpty,
          Evidence: [],
          Issues: []
        };
      }
    
      var evidenceItems = [];
      for (var i = 0; i < answers.length; i += 1) {
        var ans = answers[i];
        var sourceRef = isNonEmptyString(ans.Source_ref) ? ans.Source_ref : makeEvidenceRef(ans.Target_path, ans.Value);
        evidenceItems.push(makeConfirmationEvidence(ans.Target_path, ans.Value, sourceRef));
      }
    
      var fusionResult = fusion.fuseEvidence(draft, evidenceItems);
      if (!fusionResult.Ok) {
        var mappedIssues = fusionResult.Issues.map(function (it) {
          var rec = {
            code: it.code,
            status: it.status,
            message: it.message,
            path: it.path,
            source_rule: it.source_rule
          };
          return rec;
        });
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: mappedIssues
        };
      }
    
      var finalValidation = stage10.validateDraft(fusionResult.Draft);
      if (finalValidation.length > 0) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: finalValidation.map(function (it) {
            return {
              code: it.code,
              status: it.status,
              message: it.message,
              path: it.path,
              source_rule: it.source_rule
            };
          })
        };
      }
    
      if (draftSnapshot !== null && JSON.stringify(draft) !== draftSnapshot) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input draft was mutated during apply.', '$')]
        };
      }
      if (briefSnapshot !== null && JSON.stringify(brief) !== briefSnapshot) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input brief was mutated during apply.', '$')]
        };
      }
      if (answersSnapshot !== null && JSON.stringify(answers) !== answersSnapshot) {
        return {
          Ok: false,
          Draft: null,
          Evidence: [],
          Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input answers were mutated during apply.', '$')]
        };
      }
    
      return {
        Ok: true,
        Draft: fusionResult.Draft,
        Evidence: evidenceItems,
        Issues: []
      };
    }
    
    module.exports = {
      buildDynamicBrief: buildDynamicBrief,
      BuildDynamicBrief: buildDynamicBrief,
      applyConfirmationAnswers: applyConfirmationAnswers,
      ApplyConfirmationAnswers: applyConfirmationAnswers,
      makeEvidenceRef: makeEvidenceRef
    };
  });

  define_("/src/input-understanding/construction_adapter.js", function(module, exports, require) {
    'use strict';
    
    var core = require('../construction-core/index.js');
    
    function loadStage10() {
      return require('./index.js');
    }
    
    var calculateConstructionCore = core.calculateConstructionCore;
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function blocked(issues) {
      return {
        Ok: false,
        Confirmed_configuration: null,
        Construction_result: null,
        Issues: Array.isArray(issues) ? clone(issues) : []
      };
    }
    
    function runConstructionFromDraft(draft, profile, benchmarkReference) {
      var draftClone = clone(draft);
      var mapped = loadStage10().buildConfirmedConfiguration(draftClone);
      if (!mapped || !mapped.ok) {
        return blocked(mapped ? mapped.issues : []);
      }
      var confirmed = mapped.confirmed;
      if (!confirmed) {
        return blocked(mapped.issues || []);
      }
    
      var coreResult;
      try {
        coreResult = calculateConstructionCore(confirmed, clone(profile), benchmarkReference === undefined || benchmarkReference === null ? null : clone(benchmarkReference));
      } catch (error) {
        var errorIssues = error && Array.isArray(error.issues) ? clone(error.issues) : [];
        if (!errorIssues.length) {
          errorIssues.push({
            code: error && error.code ? error.code : 'CONSTRUCTION_CORE_ERROR',
            status: 'VALIDATION_ERROR',
            message: error && error.message ? error.message : 'Construction Core execution failed.',
            path: null,
            source_rule: null
          });
        }
        return blocked(errorIssues);
      }
    
      return {
        Ok: true,
        Confirmed_configuration: clone(confirmed),
        Construction_result: coreResult,
        Issues: []
      };
    }
    
    module.exports = {
      runConstructionFromDraft: runConstructionFromDraft,
      RunConstructionFromDraft: runConstructionFromDraft
    };
  });

  define_("/src/input-understanding/construction_defaults.js", function(module, exports, require) {
    'use strict';
    
    var SUPPORTED_OPERATORS = ['EQ', 'NE', 'LT', 'LTE', 'GT', 'GTE', 'IN', 'NOT_IN'];
    var RESOLUTION_MODES = ['DEFAULT_CANDIDATE', 'REQUIRED_QUESTION'];
    
    function clone(value) {
      if (value === undefined) return undefined;
      return JSON.parse(JSON.stringify(value));
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function hasOwn(value, key) {
      return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(value, key);
    }
    
    function isPresent(value) {
      return value !== undefined && value !== null;
    }
    
    function unwrapCell(value) {
      if (!isPlainObject(value) || !hasOwn(value, 'state')) return value;
      return hasOwn(value, 'value') ? value.value : undefined;
    }
    
    function pathTokens(path) {
      var tokens = [];
      var expression = /([^.\[\]]+)|\[(\d+)\]/g;
      var match;
      while ((match = expression.exec(String(path || ''))) !== null) {
        tokens.push(match[2] === undefined ? match[1] : Number(match[2]));
      }
      return tokens;
    }
    
    function readPath(value, path) {
      var current = value;
      var tokens = pathTokens(path);
      for (var i = 0; i < tokens.length; i += 1) {
        if (current === null || current === undefined || !hasOwn(current, tokens[i])) return undefined;
        current = current[tokens[i]];
      }
      return unwrapCell(current);
    }
    
    function readModulePath(module_, path) {
      var direct = readPath(module_, path);
      if (direct !== undefined) return direct;
      if (isPlainObject(module_) && isPlainObject(module_.dimensions) && hasOwn(module_.dimensions, path)) {
        return unwrapCell(module_.dimensions[path]);
      }
      if (isPlainObject(module_) && isPlainObject(module_.construction) && hasOwn(module_.construction, path)) {
        return unwrapCell(module_.construction[path]);
      }
      return undefined;
    }
    
    function stableValue(value) {
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(stableValue);
      var sorted = {};
      Object.keys(value).sort().forEach(function (key) {
        sorted[key] = stableValue(value[key]);
      });
      return sorted;
    }
    
    function valueKey(value) {
      return JSON.stringify(stableValue(value));
    }
    
    function compare(left, operator, right) {
      if (operator === 'EQ') return left === right;
      if (operator === 'NE') return left !== right;
      if (operator === 'LT') return left < right;
      if (operator === 'LTE') return left <= right;
      if (operator === 'GT') return left > right;
      if (operator === 'GTE') return left >= right;
      if (operator === 'IN') return Array.isArray(right) && right.some(function (item) { return item === left; });
      if (operator === 'NOT_IN') return Array.isArray(right) && !right.some(function (item) { return item === left; });
      return false;
    }
    
    function parseCondition(condition) {
      if (condition === undefined || condition === null || condition === '') return null;
      if (typeof condition === 'string') {
        try {
          return JSON.parse(condition);
        } catch (error) {
          return false;
        }
      }
      return condition;
    }
    
    function conditionMatches(condition, module_) {
      var parsed = parseCondition(condition);
      if (parsed === null) return true;
      if (!isPlainObject(parsed) || !Array.isArray(parsed.all)) return false;
    
      for (var i = 0; i < parsed.all.length; i += 1) {
        var clause = parsed.all[i];
        if (!isPlainObject(clause) || typeof clause.path !== 'string' ||
          SUPPORTED_OPERATORS.indexOf(clause.op) === -1 || !hasOwn(clause, 'value')) {
          return false;
        }
        var actual = readModulePath(module_, clause.path);
        if (actual === undefined || !compare(actual, clause.op, clause.value)) return false;
      }
      return true;
    }
    
    function isActive(row) {
      return !!row && (row.active === true || row.active === 'TRUE' || row.active === 'true' || row.active === 1);
    }
    
    function cellIsExplicit(value) {
      if (!isPlainObject(value) || !hasOwn(value, 'state')) return isPresent(value);
      return value.state === 'KNOWN' && isPresent(value.value);
    }
    
    function moduleParameterIsExplicit(module_, parameter) {
      if (!isPlainObject(module_)) return false;
      if (hasOwn(module_, parameter) && cellIsExplicit(module_[parameter])) return true;
      if (isPlainObject(module_.construction) && hasOwn(module_.construction, parameter)) {
        return cellIsExplicit(module_.construction[parameter]);
      }
      return false;
    }
    
    /*
     * The approved policy names SINK_BASE, DRAWER_BASE, and APPLIANCE_SPECIAL as
     * semantic module classes. Stage 10 represents those classes with the actual
     * module_type plus role, so these aliases are only used after exact matching.
     */
    function semanticModuleTypeMatches(rowType, module_) {
      if (rowType === 'SINK_BASE') {
        return module_.module_type === 'BASE_CABINET' && module_.role === 'SINK_BASE';
      }
      if (rowType === 'DRAWER_BASE') {
        return module_.module_type === 'BASE_CABINET' && module_.role === 'DRAWER_CABINET';
      }
      if (rowType === 'APPLIANCE_SPECIAL') {
        return module_.module_type === 'APPLIANCE_SLOT' ||
          module_.role === 'DISHWASHER_SLOT' ||
          module_.role === 'APPLIANCE_TOWER' ||
          module_.role === 'REFRIGERATOR_HOUSING';
      }
      return false;
    }
    
    function conditionValue(row) {
      if (hasOwn(row, 'Condition_json')) return row.Condition_json;
      if (hasOwn(row, 'condition_json')) return row.condition_json;
      return null;
    }
    
    function sourceRefFor(row) {
      return row.rule_id ? 'DEFAULT_' + String(row.rule_id) : 'DEFAULT_RULE';
    }
    
    function targetPathFor(assemblyIndex, moduleIndex, parameter) {
      return '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + '].construction.' + parameter;
    }
    
    function makeResolution(module_, row, assemblyIndex, moduleIndex) {
      var mode = row.resolution_mode;
      if (RESOLUTION_MODES.indexOf(mode) === -1) return null;
      var condition = conditionValue(row);
      if (!conditionMatches(condition, module_)) return null;
      var parsedCondition = parseCondition(condition);
      var sourceRef = sourceRefFor(row);
      var targetPath = targetPathFor(assemblyIndex, moduleIndex, row.parameter);
      return {
        module_id: module_.id === undefined ? null : module_.id,
        assembly_index: assemblyIndex,
        module_index: moduleIndex,
        module_type: row.module_type,
        parameter: row.parameter,
        state: mode === 'REQUIRED_QUESTION' ? 'REQUIRED_QUESTION' : 'DEFAULT_CANDIDATE',
        value: mode === 'REQUIRED_QUESTION' ? null : clone(row.default_value),
        unit: row.unit === undefined ? null : row.unit,
        resolution_mode: mode,
        confirmation_required: row.confirmation_required === true,
        rule_id: row.rule_id === undefined ? null : row.rule_id,
        source_ref: sourceRef,
        condition: row.condition === undefined ? null : row.condition,
        condition_json: parsedCondition === null ? null : clone(parsedCondition),
        description: row.description === undefined ? null : row.description,
        path: targetPath,
        Target_path: targetPath,
        Evidence_id: sourceRef
      };
    }
    
    function collectModules(modules) {
      var entries = [];
      if (Array.isArray(modules)) {
        for (var i = 0; i < modules.length; i += 1) {
          entries.push({ module: modules[i], assemblyIndex: 0, moduleIndex: i });
        }
        return entries;
      }
      if (!isPlainObject(modules) || !Array.isArray(modules.assemblies)) return entries;
      for (var a = 0; a < modules.assemblies.length; a += 1) {
        var assembly = modules.assemblies[a];
        if (!assembly || !Array.isArray(assembly.modules)) continue;
        for (var m = 0; m < assembly.modules.length; m += 1) {
          entries.push({ module: assembly.modules[m], assemblyIndex: a, moduleIndex: m });
        }
      }
      return entries;
    }
    
    function collectRows(defaultRows) {
      if (!Array.isArray(defaultRows)) return [];
      return defaultRows.map(function (row, index) {
        return { row: row, index: index };
      }).filter(function (entry) {
        return isActive(entry.row);
      }).sort(function (left, right) {
        var leftId = String(left.row.rule_id || '');
        var rightId = String(right.row.rule_id || '');
        if (leftId < rightId) return -1;
        if (leftId > rightId) return 1;
        return left.index - right.index;
      });
    }
    
    function applicableRowsForModule(rows, module_) {
      var exact = rows.filter(function (entry) {
        return entry.row.module_type === module_.module_type;
      });
      if (exact.length > 0) return exact;
      return rows.filter(function (entry) {
        return entry.row.module_type !== module_.module_type && semanticModuleTypeMatches(entry.row.module_type, module_);
      });
    }
    
    function resolutionSortKey(resolution) {
      return String(resolution.Target_path) + '\u0000' + String(resolution.parameter) + '\u0000' + String(resolution.rule_id || '');
    }
    
    /**
     * Resolve active Construction_Defaults rules against the actual Stage 10
     * module shape. Neither argument is mutated. Explicit KNOWN module values
     * always win over policy rows; default candidates are not promoted to KNOWN.
     *
     * @param {Array<Object>|Object} modules Stage 10 modules or a draft object.
     * @param {Array<Object>} defaultRows Rows matching CONSTRUCTION_DEFAULTS_V1.
     * @returns {Object} deterministic candidates and required questions.
     */
    function resolveConstructionDefaults(modules, defaultRows) {
      var moduleEntries = collectModules(modules);
      var rows = collectRows(defaultRows);
      var results = [];
      var defaultCandidates = [];
      var requiredQuestions = [];
    
      for (var m = 0; m < moduleEntries.length; m += 1) {
        var entry = moduleEntries[m];
        var module_ = entry.module || {};
        var applicable = applicableRowsForModule(rows, module_);
        for (var r = 0; r < applicable.length; r += 1) {
          var row = applicable[r].row;
          if (!row.parameter || moduleParameterIsExplicit(module_, row.parameter)) continue;
          var resolution = makeResolution(module_, row, entry.assemblyIndex, entry.moduleIndex);
          if (!resolution) continue;
          results.push(resolution);
          if (resolution.resolution_mode === 'DEFAULT_CANDIDATE') {
            defaultCandidates.push(resolution);
          } else {
            requiredQuestions.push(resolution);
          }
        }
      }
    
      results.sort(function (left, right) {
        var leftKey = resolutionSortKey(left);
        var rightKey = resolutionSortKey(right);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      defaultCandidates.sort(function (left, right) {
        return resolutionSortKey(left) < resolutionSortKey(right) ? -1 : resolutionSortKey(left) > resolutionSortKey(right) ? 1 : 0;
      });
      requiredQuestions.sort(function (left, right) {
        return resolutionSortKey(left) < resolutionSortKey(right) ? -1 : resolutionSortKey(left) > resolutionSortKey(right) ? 1 : 0;
      });
    
      return {
        Results: clone(results),
        Default_candidates: clone(defaultCandidates),
        Required_questions: clone(requiredQuestions)
      };
    }
    
    module.exports = {
      SUPPORTED_OPERATORS: SUPPORTED_OPERATORS,
      RESOLUTION_MODES: RESOLUTION_MODES,
      resolveConstructionDefaults: resolveConstructionDefaults,
      ResolveConstructionDefaults: resolveConstructionDefaults,
      conditionMatches: conditionMatches
    };
    
  });

  define_("/src/input-understanding/fusion.js", function(module, exports, require) {
    'use strict';
    
    function getStage10() {
      return require('./index.js');
    }
    
    var SOURCE_PRIORITY_ORDER = [
      'USER_CONFIRMATION',
      'USER_DIMENSION',
      'USER_TEXT',
      'IMAGE_TEXT',
      'VISION_ENTITY',
      'DEFAULT_CANDIDATE'
    ];
    
    var SOURCE_PRIORITY_MAP = {};
    for (var p = 0; p < SOURCE_PRIORITY_ORDER.length; p += 1) {
      SOURCE_PRIORITY_MAP[SOURCE_PRIORITY_ORDER[p]] = p + 1;
    }
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function issue(code, status, message, path) {
      return {
        code: code,
        status: status,
        message: message,
        path: path || null,
        source_rule: null
      };
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function isNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }
    
    function isPositiveNumber(value) {
      return isNumber(value) && value > 0;
    }
    
    function normalizeTargetPath(targetPath) {
      if (typeof targetPath !== 'string') {
        return '';
      }
      var path = targetPath.trim();
      if (path.indexOf('$.') === 0) {
        path = path.slice(2);
      }
      return path;
    }
    
    function extractNumericValue(value) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (isPlainObject(value) && typeof value.value === 'number' && Number.isFinite(value.value)) {
        var unit = value.unit;
        if (unit === 'mm' || !unit) {
          return value.value;
        }
        if (unit === 'cm') {
          return value.value * 10;
        }
        if (unit === 'm') {
          return value.value * 1000;
        }
        return value.value;
      }
      if (typeof value === 'string') {
        var parsed = Number(value.trim());
        if (Number.isFinite(parsed) && value.trim() !== '') {
          return parsed;
        }
      }
      return null;
    }
    
    function parseTargetPath(targetPath) {
      var normalized = normalizeTargetPath(targetPath);
      var moduleDimMatch = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.dimensions\.(width_mm|height_mm|depth_mm)$/.exec(normalized);
      if (moduleDimMatch) {
        return {
          type: 'MODULE_DIMENSION',
          assemblyIndex: parseInt(moduleDimMatch[1], 10),
          moduleIndex: parseInt(moduleDimMatch[2], 10),
          dimensionKey: moduleDimMatch[3],
          normalizedPath: normalized
        };
      }
    
      var moduleConstructionMatch = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.construction\.([A-Za-z0-9_]+)$/.exec(normalized);
      if (moduleConstructionMatch) {
        return {
          type: 'MODULE_CONSTRUCTION',
          assemblyIndex: parseInt(moduleConstructionMatch[1], 10),
          moduleIndex: parseInt(moduleConstructionMatch[2], 10),
          parameter: moduleConstructionMatch[3],
          normalizedPath: normalized
        };
      }
    
      var globalDimMatch = /^global_dimensions\.(finished_worktop_height_mm|toe_kick_height_mm|countertop_thickness_mm)$/.exec(normalized);
      if (globalDimMatch) {
        return {
          type: 'GLOBAL_DIMENSION',
          fieldKey: globalDimMatch[1],
          normalizedPath: normalized
        };
      }
    
      var assemblyOverallMatch = /^assemblies\[(\d+)\]\.(overall_width_mm|overall_depth_mm|finished_height_mm)$/.exec(normalized);
      if (assemblyOverallMatch) {
        return {
          type: 'ASSEMBLY_DIMENSION',
          assemblyIndex: parseInt(assemblyOverallMatch[1], 10),
          fieldKey: assemblyOverallMatch[2],
          normalizedPath: normalized
        };
      }
    
      return null;
    }
    
    function resolveCellLocation(draft, parsed) {
      if (!parsed) {
        return null;
      }
    
      if (parsed.type === 'MODULE_DIMENSION') {
        if (!draft.assemblies || !draft.assemblies[parsed.assemblyIndex]) {
          return null;
        }
        var assembly = draft.assemblies[parsed.assemblyIndex];
        if (!assembly.modules || !assembly.modules[parsed.moduleIndex]) {
          return null;
        }
        var module_ = assembly.modules[parsed.moduleIndex];
        if (!module_.dimensions || !isPlainObject(module_.dimensions[parsed.dimensionKey])) {
          return null;
        }
        return {
          kind: 'DIMENSION_CELL',
          get: function () {
            return module_.dimensions[parsed.dimensionKey];
          },
          set: function (newCell) {
            module_.dimensions[parsed.dimensionKey] = newCell;
          }
        };
      }
    
      if (parsed.type === 'MODULE_CONSTRUCTION') {
        if (!draft.assemblies || !draft.assemblies[parsed.assemblyIndex]) return null;
        var constructionAssembly = draft.assemblies[parsed.assemblyIndex];
        if (!constructionAssembly.modules || !constructionAssembly.modules[parsed.moduleIndex]) return null;
        var constructionModule = constructionAssembly.modules[parsed.moduleIndex];
        if (!isPlainObject(constructionModule.construction) || !isPlainObject(constructionModule.construction[parsed.parameter])) return null;
        return {
          kind: 'CONSTRUCTION_CELL',
          get: function () {
            return constructionModule.construction[parsed.parameter];
          },
          set: function (newCell) {
            constructionModule.construction[parsed.parameter] = newCell;
          }
        };
      }
    
      return null;
    }
    
    function compareEvidenceDeterministically(a, b) {
      var normA = normalizeTargetPath(a.target_path);
      var normB = normalizeTargetPath(b.target_path);
      if (normA < normB) return -1;
      if (normA > normB) return 1;
    
      var pA = SOURCE_PRIORITY_MAP[a.source_type] || 999;
      var pB = SOURCE_PRIORITY_MAP[b.source_type] || 999;
      if (pA < pB) return -1;
      if (pA > pB) return 1;
    
      var refA = String(a.source_ref || '');
      var refB = String(b.source_ref || '');
      if (refA < refB) return -1;
      if (refA > refB) return 1;
    
      var strValA = JSON.stringify(a.value !== undefined ? a.value : null);
      var strValB = JSON.stringify(b.value !== undefined ? b.value : null);
      if (strValA < strValB) return -1;
      if (strValA > strValB) return 1;
    
      var confA = typeof a.confidence === 'number' ? a.confidence : 0;
      var confB = typeof b.confidence === 'number' ? b.confidence : 0;
      if (confB !== confA) {
        return confB - confA;
      }
    
      return 0;
    }
    
    function sortedUniqueNumbers(values) {
      var seen = {};
      var out = [];
      for (var i = 0; i < values.length; i += 1) {
        var v = values[i];
        if (isNumber(v) && !Object.prototype.hasOwnProperty.call(seen, v)) {
          seen[v] = true;
          out.push(v);
        }
      }
      out.sort(function (x, y) { return x - y; });
      return out;
    }
    
    function fuseEvidence(draft, evidenceItems) {
      var stage10 = getStage10();
    
      if (!isPlainObject(draft)) {
        return {
          Ok: false,
          Draft: null,
          Issues: [issue('DRAFT_INVALID', 'VALIDATION_ERROR', 'Input draft must be a valid object.', '$')]
        };
      }
    
      var draftValidation = stage10.validateDraft(draft);
      if (draftValidation.length > 0) {
        return {
          Ok: false,
          Draft: null,
          Issues: draftValidation
        };
      }
    
      if (!Array.isArray(evidenceItems)) {
        return {
          Ok: false,
          Draft: null,
          Issues: [issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'evidenceItems must be an array.', '$')]
        };
      }
    
      var evidenceValidation = stage10.validateEvidence(evidenceItems);
      if (evidenceValidation.length > 0) {
        return {
          Ok: false,
          Draft: null,
          Issues: evidenceValidation
        };
      }
    
      var clonedDraft = clone(draft);
      var issues = [];
    
      var sortedEvidence = evidenceItems.slice().sort(compareEvidenceDeterministically);
    
      var evidenceByTarget = {};
      var targetPathList = [];
    
      for (var i = 0; i < sortedEvidence.length; i += 1) {
        var ev = sortedEvidence[i];
        var parsed = parseTargetPath(ev.target_path);
        if (!parsed) {
          issues.push(issue('UNKNOWN_TARGET_PATH', 'VALIDATION_ERROR', 'Unknown or unresolvable target_path: ' + ev.target_path, 'evidence[' + i + '].target_path'));
          continue;
        }
    
        var location = resolveCellLocation(clonedDraft, parsed);
        if (!location) {
          issues.push(issue('TARGET_PATH_NOT_FOUND', 'VALIDATION_ERROR', 'target_path does not resolve to an existing draft cell: ' + ev.target_path, 'evidence[' + i + '].target_path'));
          continue;
        }
    
        var normPath = parsed.normalizedPath;
        if (!evidenceByTarget[normPath]) {
          evidenceByTarget[normPath] = {
            parsed: parsed,
            location: location,
            items: []
          };
          targetPathList.push(normPath);
        }
        evidenceByTarget[normPath].items.push(ev);
      }
    
      if (issues.length > 0) {
        return {
          Ok: false,
          Draft: null,
          Issues: issues
        };
      }
    
      targetPathList.sort();
    
      for (var t = 0; t < targetPathList.length; t += 1) {
        var targetKey = targetPathList[t];
        var group = evidenceByTarget[targetKey];
        var items = group.items;
        var location = group.location;
    
        var highestPriorityRank = 999;
        for (var j = 0; j < items.length; j += 1) {
          var r = SOURCE_PRIORITY_MAP[items[j].source_type] || 999;
          if (r < highestPriorityRank) {
            highestPriorityRank = r;
          }
        }
    
        var highestPriorityItems = [];
        for (var k = 0; k < items.length; k += 1) {
          var itemRank = SOURCE_PRIORITY_MAP[items[k].source_type] || 999;
          if (itemRank === highestPriorityRank) {
            highestPriorityItems.push(items[k]);
          }
        }
    
        var numericValues = [];
        for (var h = 0; h < highestPriorityItems.length; h += 1) {
          var numVal = extractNumericValue(highestPriorityItems[h].value);
          if (numVal !== null) {
            numericValues.push(numVal);
          }
        }
    
        var uniqueValues = sortedUniqueNumbers(numericValues);
        var primaryItem = highestPriorityItems[0];
        var primarySourceType = primaryItem.source_type;
    
        if (uniqueValues.length === 1) {
          var chosenValue = uniqueValues[0];
          if (primarySourceType === 'DEFAULT_CANDIDATE') {
            location.set({
              state: 'NEEDS_CONFIRMATION',
              value: chosenValue,
              source_type: 'DEFAULT_CANDIDATE',
              source_ref: primaryItem.source_ref,
              evidence_state: 'ALPHA_DEFAULT',
              note: 'Default candidate from ' + primaryItem.source_ref
            });
          } else {
            var evidenceState = 'EXPLICIT';
            if (primarySourceType === 'USER_CONFIRMATION') {
              evidenceState = 'MANAGER_CONFIRMED';
            } else if (primarySourceType === 'VISION_ENTITY') {
              evidenceState = 'VISUAL_INFERRED';
            }
    
            location.set({
              state: 'KNOWN',
              value: chosenValue,
              source_ref: primaryItem.source_ref,
              source_type: primarySourceType,
              evidence_state: evidenceState,
              note: 'Fused value from ' + primarySourceType
            });
          }
        } else if (uniqueValues.length > 1) {
          location.set({
            state: 'CONFLICT',
            options: uniqueValues,
            source_ref: primaryItem.source_ref,
            source_type: primarySourceType,
            evidence_state: 'EXPLICIT',
            note: 'Conflicting values at priority ' + primarySourceType + ': ' + uniqueValues.join(', ')
          });
        } else if (primarySourceType === 'USER_CONFIRMATION') {
          location.set({
            state: 'KNOWN',
            value: clone(highestPriorityItems[0].value),
            source_ref: primaryItem.source_ref,
            source_type: primarySourceType,
            evidence_state: 'MANAGER_CONFIRMED',
            note: 'Fused value from ' + primarySourceType
          });
        }
      }
    
      var existingSourceRefIds = {};
      if (Array.isArray(clonedDraft.source_refs)) {
        for (var s = 0; s < clonedDraft.source_refs.length; s += 1) {
          existingSourceRefIds[clonedDraft.source_refs[s].id] = true;
        }
      } else {
        clonedDraft.source_refs = [];
      }
    
      for (var e = 0; e < sortedEvidence.length; e += 1) {
        var refId = sortedEvidence[e].source_ref;
        if (refId && !existingSourceRefIds[refId]) {
          var refType = 'NOTE';
          if (sortedEvidence[e].source_type === 'USER_CONFIRMATION') {
            refType = 'MANUAL_CONFIRMATION';
          } else if (sortedEvidence[e].source_type === 'IMAGE_TEXT' || sortedEvidence[e].source_type === 'VISION_ENTITY') {
            refType = 'IMAGE';
          }
          clonedDraft.source_refs.push({
            id: refId,
            type: refType,
            file: refId,
            note: 'Fused evidence source: ' + sortedEvidence[e].source_type
          });
          existingSourceRefIds[refId] = true;
        }
      }
    
      return {
        Ok: true,
        Draft: clonedDraft,
        Issues: []
      };
    }
    
    module.exports = {
      SOURCE_PRIORITY_ORDER: SOURCE_PRIORITY_ORDER,
      SOURCE_PRIORITY_MAP: SOURCE_PRIORITY_MAP,
      fuseEvidence: fuseEvidence,
      FuseEvidence: fuseEvidence
    };
    
  });

  define_("/src/input-understanding/index.js", function(module, exports, require) {
    'use strict';
    
    var EVIDENCE_STATES = ['ACTIVE', 'SUPERSEDED', 'CONFLICTED'];
    var EVIDENCE_SOURCE_TYPES = [
      'USER_CONFIRMATION',
      'USER_DIMENSION',
      'USER_TEXT',
      'IMAGE_TEXT',
      'VISION_ENTITY',
      'DEFAULT_CANDIDATE'
    ];
    
    var DRAFT_CELL_STATES = ['KNOWN', 'MISSING', 'CONFLICT', 'NEEDS_CONFIRMATION'];
    
    var DIMENSION_EVIDENCE_STATES = [
      'EXPLICIT',
      'DERIVED',
      'VISUAL_INFERRED',
      'ALPHA_DEFAULT',
      'MANAGER_CONFIRMED'
    ];
    
    var FRONT_EVIDENCE_STATES = ['EXPLICIT', 'VISUAL_INFERRED', 'MANAGER_CONFIRMED'];
    
    var MODULE_TYPES = [
      'BASE_CABINET',
      'WALL_CABINET',
      'TALL_CABINET',
      'APPLIANCE_SLOT',
      'CUSTOM_CABINET'
    ];
    
    var MODULE_ROLES = [
      'GENERAL_STORAGE',
      'DRAWER_CABINET',
      'SINK_BASE',
      'DISHWASHER_SLOT',
      'REFRIGERATOR_HOUSING',
      'APPLIANCE_TOWER',
      'WALL_STORAGE',
      'UNKNOWN'
    ];
    
    var FRONT_KINDS = ['HINGED_DOOR', 'DRAWER_FRONT', 'APPLIANCE_FRONT', 'FIXED_PANEL', 'UNKNOWN'];
    var APPLIANCE_TYPES = ['DISHWASHER', 'OVEN', 'MICROWAVE', 'REFRIGERATOR', 'OTHER'];
    var ASSEMBLY_KINDS = ['LINEAR_RUN', 'ISLAND', 'OTHER'];
    var OPENING_TYPES = ['WINDOW', 'VOID', 'OTHER'];
    var SURFACE_TYPES = ['COUNTERTOP', 'DECORATIVE_CLADDING', 'END_PANEL', 'OTHER'];
    var SOURCE_REF_TYPES = ['PDF', 'IMAGE', 'NOTE', 'MANUAL_CONFIRMATION'];
    
    var DRAFT_SCHEMA_VERSION = 'draft-configuration-v1';
    var CONFIRMED_SCHEMA_VERSION = 'confirmed-configuration-v1';
    var CONFIRMED_STATUS = 'CONFIRMED_FOR_ALPHA';
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function issue(code, status, message, path) {
      return {
        code: code,
        status: status,
        message: message,
        path: path || null,
        source_rule: null
      };
    }
    
    function isNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }
    
    function isPositiveNumber(value) {
      return isNumber(value) && value > 0;
    }
    
    function isNonNegativeNumber(value) {
      return isNumber(value) && value >= 0;
    }
    
    function isNonEmptyString(value) {
      return typeof value === 'string' && value.length > 0;
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function inEnum(value, allowed) {
      return allowed.indexOf(value) !== -1;
    }
    
    function validateEvidenceItem(item, path, errors) {
      if (!isPlainObject(item)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item must be an object.', path));
        return;
      }
      if (!isNonEmptyString(item.target_path)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a target_path string.', path + '.target_path'));
      }
      if (!isNonEmptyString(item.source_type) || !inEnum(item.source_type, EVIDENCE_SOURCE_TYPES)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item has an invalid source_type.', path + '.source_type'));
      }
      if (!isNonEmptyString(item.source_ref)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a source_ref string.', path + '.source_ref'));
      }
      if (!isNonEmptyString(item.state) || !inEnum(item.state, EVIDENCE_STATES)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item has an invalid state.', path + '.state'));
      }
      if (!isNonNegativeNumber(item.confidence) || item.confidence > 1) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item confidence must be a number between 0 and 1.', path + '.confidence'));
      }
      if (!('value' in item)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a value field (null allowed).', path + '.value'));
      }
    }
    
    function validateEvidence(evidence) {
      var errors = [];
      if (!Array.isArray(evidence)) {
        errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence must be an array.', '$'));
        return errors;
      }
      for (var i = 0; i < evidence.length; i += 1) {
        validateEvidenceItem(evidence[i], '$[' + i + ']', errors);
      }
      return errors;
    }
    
    function fail() {
      return false;
    }
    
    function validateDimensionCell(cell, path, errors) {
      if (!isPlainObject(cell)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Dimension must be an object.', path));
        return false;
      }
      if (!isNonEmptyString(cell.state) || !inEnum(cell.state, DRAFT_CELL_STATES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Dimension has an invalid state.', path + '.state'));
        return false;
      }
      if (cell.state === 'KNOWN') {
        if (!isPositiveNumber(cell.value)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a positive numeric value.', path + '.value'));
          return false;
        }
        if (!isNonEmptyString(cell.source_ref)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a source_ref.', path + '.source_ref'));
          return false;
        }
        if (!isNonEmptyString(cell.source_type) || !inEnum(cell.source_type, EVIDENCE_SOURCE_TYPES)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension has an invalid source_type.', path + '.source_type'));
          return false;
        }
        if (!isNonEmptyString(cell.evidence_state) || !inEnum(cell.evidence_state, DIMENSION_EVIDENCE_STATES)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension has an invalid evidence_state.', path + '.evidence_state'));
          return false;
        }
        if (!isNonEmptyString(cell.note)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a note.', path + '.note'));
          return false;
        }
      } else if (cell.state === 'CONFLICT') {
        if (!Array.isArray(cell.options) || cell.options.length < 2) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'CONFLICT dimension requires at least two options.', path + '.options'));
          return false;
        }
        for (var i = 0; i < cell.options.length; i += 1) {
          if (!isPositiveNumber(cell.options[i])) {
            errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'CONFLICT dimension options must be positive numbers.', path + '.options[' + i + ']'));
            return false;
          }
        }
      }
      return true;
    }
    
    function validateConstructionParameterCell(cell, path, errors) {
      if (!isPlainObject(cell)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Construction parameter must be an object.', path));
        return false;
      }
      if (!isNonEmptyString(cell.state) || !inEnum(cell.state, DRAFT_CELL_STATES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Construction parameter has an invalid state.', path + '.state'));
        return false;
      }
      if (cell.state === 'KNOWN') {
        if (!Object.prototype.hasOwnProperty.call(cell, 'value') || cell.value === undefined || cell.value === null) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN construction parameter requires a non-null value.', path + '.value'));
          return false;
        }
        if (!isNonEmptyString(cell.source_ref)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN construction parameter requires a source_ref.', path + '.source_ref'));
          return false;
        }
        if (!isNonEmptyString(cell.source_type) || !inEnum(cell.source_type, EVIDENCE_SOURCE_TYPES)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN construction parameter has an invalid source_type.', path + '.source_type'));
          return false;
        }
        if (!isNonEmptyString(cell.evidence_state) || !inEnum(cell.evidence_state, DIMENSION_EVIDENCE_STATES)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN construction parameter has an invalid evidence_state.', path + '.evidence_state'));
          return false;
        }
        if (!isNonEmptyString(cell.note)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN construction parameter requires a note.', path + '.note'));
          return false;
        }
      } else if (cell.state === 'CONFLICT') {
        if (!Array.isArray(cell.options) || cell.options.length < 2) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'CONFLICT construction parameter requires at least two options.', path + '.options'));
          return false;
        }
      }
      return true;
    }
    
    function validateFront(front, path, errors) {
      if (!isPlainObject(front)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front must be an object.', path));
        return;
      }
      if (!isNonEmptyString(front.kind) || !inEnum(front.kind, FRONT_KINDS)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front has an invalid kind.', path + '.kind'));
      }
      if (!(Number.isInteger(front.count) && front.count >= 1)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front count must be an integer >= 1.', path + '.count'));
      }
      if (!isNonEmptyString(front.evidence_state) || !inEnum(front.evidence_state, FRONT_EVIDENCE_STATES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front has an invalid evidence_state.', path + '.evidence_state'));
      }
    }
    
    function validateApplianceSlot(slot, path, errors) {
      if (!isPlainObject(slot)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Appliance slot must be an object.', path));
        return;
      }
      if (!isNonEmptyString(slot.type) || !inEnum(slot.type, APPLIANCE_TYPES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Appliance slot has an invalid type.', path + '.type'));
      }
    }
    
    function validateOptionalPositive(value, path, errors) {
      if (value !== undefined && value !== null && !isPositiveNumber(value)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be a positive number or null.', path));
      }
    }
    
    function validateOptionalNonNegative(value, path, errors) {
      if (value !== undefined && value !== null && !isNonNegativeNumber(value)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be a non-negative number or null.', path));
      }
    }
    
    function validateStringArray(value, path, errors) {
      if (value === undefined) {
        return;
      }
      if (!Array.isArray(value)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be an array.', path));
        return;
      }
      for (var i = 0; i < value.length; i += 1) {
        if (!isNonEmptyString(value[i])) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Items must be non-empty strings.', path + '[' + i + ']'));
        }
      }
    }
    
    function validateSourceRef(sourceRef, path, errors) {
      if (!isPlainObject(sourceRef) || !isNonEmptyString(sourceRef.id) || !inEnum(sourceRef.type, SOURCE_REF_TYPES) || !isNonEmptyString(sourceRef.file) || !isNonEmptyString(sourceRef.note)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Source ref requires id, type, file, and note.', path));
      }
    }
    
    function validateGlobalDimensions(globalDimensions, errors) {
      if (globalDimensions === undefined || globalDimensions === null) {
        return;
      }
      if (!isPlainObject(globalDimensions)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'global_dimensions must be an object.', '$.global_dimensions'));
        return;
      }
      validateOptionalPositive(globalDimensions.finished_worktop_height_mm, '$.global_dimensions.finished_worktop_height_mm', errors);
      validateOptionalNonNegative(globalDimensions.toe_kick_height_mm, '$.global_dimensions.toe_kick_height_mm', errors);
      validateOptionalNonNegative(globalDimensions.countertop_thickness_mm, '$.global_dimensions.countertop_thickness_mm', errors);
    }
    
    function validateModule(module, assemblyIndex, moduleIndex, errors) {
      var path = '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + ']';
      if (!isPlainObject(module)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module must be an object.', path));
        return;
      }
      if (!isNonEmptyString(module.id)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires an id.', path + '.id'));
      }
      if (!isNonEmptyString(module.module_type) || !inEnum(module.module_type, MODULE_TYPES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module has an invalid module_type.', path + '.module_type'));
      }
      if (!isNonEmptyString(module.role) || !inEnum(module.role, MODULE_ROLES)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module has an invalid role.', path + '.role'));
      }
      if (!isNonNegativeNumber(module.x_mm)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a non-negative x_mm.', path + '.x_mm'));
      }
      validateOptionalNonNegative(module.y_mm, path + '.y_mm', errors);
      if (module.quantity !== undefined && !(Number.isInteger(module.quantity) && module.quantity >= 1)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module quantity must be an integer >= 1.', path + '.quantity'));
      }
      if (!(Array.isArray(module.fronts))) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a fronts array.', path + '.fronts'));
      } else {
        for (var i = 0; i < module.fronts.length; i += 1) {
          validateFront(module.fronts[i], path + '.fronts[' + i + ']', errors);
        }
      }
      if (!(Array.isArray(module.appliance_slots))) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires an appliance_slots array.', path + '.appliance_slots'));
      } else {
        for (var j = 0; j < module.appliance_slots.length; j += 1) {
          validateApplianceSlot(module.appliance_slots[j], path + '.appliance_slots[' + j + ']', errors);
        }
      }
      validateStringArray(module.notes, path + '.notes', errors);
      if (!isPlainObject(module.dimensions)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a dimensions object.', path + '.dimensions'));
        return;
      }
      validateDimensionCell(module.dimensions.width_mm, path + '.dimensions.width_mm', errors);
      validateDimensionCell(module.dimensions.height_mm, path + '.dimensions.height_mm', errors);
      validateDimensionCell(module.dimensions.depth_mm, path + '.dimensions.depth_mm', errors);
      if (module.construction !== undefined) {
        if (!isPlainObject(module.construction)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module construction must be an object.', path + '.construction'));
        } else {
          var constructionKeys = Object.keys(module.construction).sort();
          for (var c = 0; c < constructionKeys.length; c += 1) {
            validateConstructionParameterCell(module.construction[constructionKeys[c]], path + '.construction.' + constructionKeys[c], errors);
          }
        }
      }
    }
    
    function validateOpening(opening, path, errors) {
      if (!isPlainObject(opening) || !isNonEmptyString(opening.id) || !inEnum(opening.type, OPENING_TYPES) || !isNonNegativeNumber(opening.x_mm) || !isPositiveNumber(opening.width_mm)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Opening requires id, type, x_mm, and positive width_mm.', path));
        return;
      }
      validateOptionalPositive(opening.height_mm, path + '.height_mm', errors);
    }
    
    function validateSurface(surface, path, errors) {
      if (!isPlainObject(surface) || !isNonEmptyString(surface.id) || !inEnum(surface.type, SURFACE_TYPES) || !isPositiveNumber(surface.width_mm) || !isPositiveNumber(surface.depth_mm) || !isPositiveNumber(surface.thickness_mm)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Surface requires id, type, positive width_mm, depth_mm, and thickness_mm.', path));
        return;
      }
    }
    
    function validateAssembly(assembly, index, errors) {
      var path = '$.assemblies[' + index + ']';
      if (!isPlainObject(assembly)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly must be an object.', path));
        return;
      }
      if (!isNonEmptyString(assembly.id)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly requires an id.', path + '.id'));
      }
      if (!isNonEmptyString(assembly.kind) || !inEnum(assembly.kind, ASSEMBLY_KINDS)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly has an invalid kind.', path + '.kind'));
      }
      validateOptionalPositive(assembly.overall_width_mm, path + '.overall_width_mm', errors);
      validateOptionalPositive(assembly.overall_depth_mm, path + '.overall_depth_mm', errors);
      validateOptionalPositive(assembly.finished_height_mm, path + '.finished_height_mm', errors);
      if (!Array.isArray(assembly.modules)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly requires a modules array.', path + '.modules'));
      } else {
        for (var i = 0; i < assembly.modules.length; i += 1) {
          validateModule(assembly.modules[i], index, i, errors);
        }
      }
      if (assembly.openings !== undefined) {
        if (!Array.isArray(assembly.openings)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly openings must be an array.', path + '.openings'));
        } else {
          for (var j = 0; j < assembly.openings.length; j += 1) {
            validateOpening(assembly.openings[j], path + '.openings[' + j + ']', errors);
          }
        }
      }
      if (assembly.non_carcass_surfaces !== undefined) {
        if (!Array.isArray(assembly.non_carcass_surfaces)) {
          errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly non_carcass_surfaces must be an array.', path + '.non_carcass_surfaces'));
        } else {
          for (var k = 0; k < assembly.non_carcass_surfaces.length; k += 1) {
            validateSurface(assembly.non_carcass_surfaces[k], path + '.non_carcass_surfaces[' + k + ']', errors);
          }
        }
      }
      validateStringArray(assembly.notes, path + '.notes', errors);
    }
    
    function validateDraft(draft) {
      var errors = [];
      if (!isPlainObject(draft)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft must be an object.', '$'));
        return errors;
      }
      if (draft.schema_version !== DRAFT_SCHEMA_VERSION) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft schema_version must be ' + DRAFT_SCHEMA_VERSION + '.', '$.schema_version'));
      }
      if (!isNonEmptyString(draft.project_id)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a project_id.', '$.project_id'));
      }
      if (!isNonEmptyString(draft.construction_profile_id)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a construction_profile_id.', '$.construction_profile_id'));
      }
      if (!Array.isArray(draft.source_refs)) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a source_refs array.', '$.source_refs'));
      } else {
        for (var i = 0; i < draft.source_refs.length; i += 1) {
          validateSourceRef(draft.source_refs[i], '$.source_refs[' + i + ']', errors);
        }
      }
      validateGlobalDimensions(draft.global_dimensions, errors);
      if (!Array.isArray(draft.assemblies) || draft.assemblies.length < 1) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires at least one assembly.', '$.assemblies'));
      } else {
        for (var a = 0; a < draft.assemblies.length; a += 1) {
          validateAssembly(draft.assemblies[a], a, errors);
        }
      }
      return errors;
    }
    
    function resolveCell(cell, field, path, dimensionEvidence, issues) {
      if (cell.state === 'KNOWN') {
        dimensionEvidence.push({
          field: field,
          source_ref: cell.source_ref,
          state: cell.evidence_state,
          note: cell.note
        });
        return cell.value;
      }
      if (cell.state === 'CONFLICT') {
        issues.push(issue('UNRESOLVED_CONFLICT', 'BLOCKING', 'Dimension has unresolved conflicting values: ' + cell.options.join(', ') + '.', path));
        return undefined;
      }
      if (cell.state === 'NEEDS_CONFIRMATION') {
        issues.push(issue('CONFIRMATION_REQUIRED', 'BLOCKING', 'Dimension value still requires confirmation.', path));
        return undefined;
      }
      return undefined;
    }
    
    function resolveConstructionCell(cell, field, path, issues) {
      if (!cell || cell.state === 'MISSING') {
        issues.push(issue('MISSING_REQUIRED_VALUE', 'BLOCKING', 'Construction parameter is missing and must be resolved before confirmation.', path));
        return undefined;
      }
      if (cell.state === 'KNOWN') return cell.value;
      if (cell.state === 'CONFLICT') {
        issues.push(issue('UNRESOLVED_CONFLICT', 'BLOCKING', 'Construction parameter has unresolved conflicting values.', path));
        return undefined;
      }
      if (cell.state === 'NEEDS_CONFIRMATION') {
        issues.push(issue('CONFIRMATION_REQUIRED', 'BLOCKING', 'Construction parameter still requires confirmation.', path));
        return undefined;
      }
      return undefined;
    }
    
    function resolveNullableCell(cell, field, path, dimensionEvidence, issues) {
      if (cell.state === 'KNOWN') {
        dimensionEvidence.push({
          field: field,
          source_ref: cell.source_ref,
          state: cell.evidence_state,
          note: cell.note
        });
        return cell.value;
      }
      if (cell.state === 'CONFLICT') {
        issues.push(issue('UNRESOLVED_CONFLICT', 'BLOCKING', 'Dimension has unresolved conflicting values: ' + cell.options.join(', ') + '.', path));
        return null;
      }
      if (cell.state === 'NEEDS_CONFIRMATION') {
        issues.push(issue('CONFIRMATION_REQUIRED', 'BLOCKING', 'Dimension value still requires confirmation.', path));
        return null;
      }
      if (cell.state === 'MISSING') {
        dimensionEvidence.push({
          field: field,
          source_ref: 'NONE',
          state: 'DERIVED',
          note: 'Value is missing; emitted as null without applying a default.'
        });
        return null;
      }
      return null;
    }
    
    function mapModule(module, assemblyIndex, moduleIndex, issues) {
      var basePath = '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + ']';
      var dimensionEvidence = [];
      var width = resolveCell(module.dimensions.width_mm, 'width_mm', basePath + '.dimensions.width_mm', dimensionEvidence, issues);
      var height = resolveNullableCell(module.dimensions.height_mm, 'height_mm', basePath + '.dimensions.height_mm', dimensionEvidence, issues);
      var depth = resolveNullableCell(module.dimensions.depth_mm, 'depth_mm', basePath + '.dimensions.depth_mm', dimensionEvidence, issues);
      if (width === undefined) {
        issues.push(issue('MISSING_REQUIRED_VALUE', 'BLOCKING', 'Module width_mm is required and must be resolved before confirmation.', basePath + '.dimensions.width_mm'));
        width = null;
      }
      var mapped = {
        id: module.id,
        module_type: module.module_type,
        role: module.role,
        x_mm: module.x_mm,
        y_mm: module.y_mm === undefined ? null : module.y_mm,
        width_mm: width,
        height_mm: height,
        depth_mm: depth,
        dimension_evidence: dimensionEvidence,
        fronts: clone(module.fronts),
        appliance_slots: clone(module.appliance_slots)
      };
      if (Number.isInteger(module.quantity)) {
        mapped.quantity = module.quantity;
      }
      if (module.notes !== undefined) {
        mapped.notes = clone(module.notes);
      }
      if (isPlainObject(module.construction)) {
        mapped.construction = {};
        var constructionKeys = Object.keys(module.construction).sort();
        for (var c = 0; c < constructionKeys.length; c += 1) {
          var constructionKey = constructionKeys[c];
          var constructionCell = module.construction[constructionKey];
          var constructionValue = resolveConstructionCell(constructionCell, constructionKey, basePath + '.construction.' + constructionKey, issues);
          if (constructionValue !== undefined) {
            mapped.construction[constructionKey] = constructionValue;
          }
        }
      }
      return mapped;
    }
    
    function mapAssembly(assembly, index, issues) {
      var mapped = {
        id: assembly.id,
        kind: assembly.kind,
        overall_width_mm: assembly.overall_width_mm === undefined ? null : assembly.overall_width_mm,
        overall_depth_mm: assembly.overall_depth_mm === undefined ? null : assembly.overall_depth_mm,
        finished_height_mm: assembly.finished_height_mm === undefined ? null : assembly.finished_height_mm,
        modules: []
      };
      for (var i = 0; i < assembly.modules.length; i += 1) {
        mapped.modules.push(mapModule(assembly.modules[i], index, i, issues));
      }
      var openings = [];
      if (Array.isArray(assembly.openings)) {
        openings = clone(assembly.openings);
      }
      mapped.openings = openings;
      var surfaces = [];
      if (Array.isArray(assembly.non_carcass_surfaces)) {
        surfaces = clone(assembly.non_carcass_surfaces);
      }
      mapped.non_carcass_surfaces = surfaces;
      if (assembly.notes !== undefined) {
        mapped.notes = clone(assembly.notes);
      }
      return mapped;
    }
    
    function buildConfirmedConfiguration(draft) {
      var structuralErrors = validateDraft(draft);
      if (structuralErrors.length) {
        return { ok: false, confirmed: null, issues: structuralErrors };
      }
      var issues = [];
      var confirmed = {
        schema_version: CONFIRMED_SCHEMA_VERSION,
        project_id: draft.project_id,
        status: CONFIRMED_STATUS,
        units: 'mm',
        construction_profile_id: draft.construction_profile_id,
        source_refs: clone(draft.source_refs),
        global_dimensions: {},
        assemblies: []
      };
      if (isPlainObject(draft.global_dimensions)) {
        confirmed.global_dimensions = {
          finished_worktop_height_mm: draft.global_dimensions.finished_worktop_height_mm === undefined ? null : draft.global_dimensions.finished_worktop_height_mm,
          toe_kick_height_mm: draft.global_dimensions.toe_kick_height_mm === undefined ? null : draft.global_dimensions.toe_kick_height_mm,
          countertop_thickness_mm: draft.global_dimensions.countertop_thickness_mm === undefined ? null : draft.global_dimensions.countertop_thickness_mm
        };
      }
      for (var i = 0; i < draft.assemblies.length; i += 1) {
        confirmed.assemblies.push(mapAssembly(draft.assemblies[i], i, issues));
      }
      if (issues.length) {
        return { ok: false, confirmed: null, issues: issues };
      }
      return { ok: true, confirmed: confirmed, issues: issues };
    }
    
    function sanitizePathForId(targetPath) {
      var raw = String(targetPath || '').replace(/[^A-Za-z0-9]+/g, '_');
      raw = raw.replace(/^_+|_+$/g, '');
      return raw.length ? raw : 'root';
    }
    
    function makeQuestionId(targetPath, reason) {
      return 'q_' + sanitizePathForId(targetPath) + '_' + String(reason || '').toLowerCase();
    }
    
    function isRequiredDimension(targetPath) {
      return String(targetPath).indexOf('.dimensions.width_mm') !== -1 &&
        String(targetPath).indexOf('.modules[') !== -1;
    }
    
    function reasonForState(state) {
      if (state === 'MISSING') {
        return 'MISSING_REQUIRED_VALUE';
      }
      if (state === 'CONFLICT') {
        return 'UNRESOLVED_CONFLICT';
      }
      if (state === 'NEEDS_CONFIRMATION') {
        return 'CONFIRMATION_REQUIRED';
      }
      return null;
    }
    
    function compareTargetPath(a, b) {
      var pa = String(a.Target_path);
      var pb = String(b.Target_path);
      if (pa < pb) {
        return -1;
      }
      if (pa > pb) {
        return 1;
      }
      return 0;
    }
    
    function sortByTargetPath(arr) {
      return arr.slice().sort(compareTargetPath);
    }
    
    function collectDimensionCells(draft) {
      var cells = [];
      if (!isPlainObject(draft) || !Array.isArray(draft.assemblies)) {
        return cells;
      }
      for (var a = 0; a < draft.assemblies.length; a += 1) {
        var assembly = draft.assemblies[a];
        if (!isPlainObject(assembly) || !Array.isArray(assembly.modules)) {
          continue;
        }
        for (var m = 0; m < assembly.modules.length; m += 1) {
          var module_ = assembly.modules[m];
          if (!isPlainObject(module_) || !isPlainObject(module_.dimensions)) {
            continue;
          }
          var basePath = '$.assemblies[' + a + '].modules[' + m + '].dimensions';
          var dims = module_.dimensions;
          var fields = ['width_mm', 'height_mm', 'depth_mm'];
          for (var f = 0; f < fields.length; f += 1) {
            var field = fields[f];
            var cell = dims[field];
            if (isPlainObject(cell)) {
              cells.push({
                target_path: basePath + '.' + field,
                field: field,
                cell: cell
              });
            }
          }
        }
      }
      return cells;
    }
    
    function collectConstructionCells(draft) {
      var cells = [];
      if (!isPlainObject(draft) || !Array.isArray(draft.assemblies)) return cells;
      for (var a = 0; a < draft.assemblies.length; a += 1) {
        var assembly = draft.assemblies[a];
        if (!isPlainObject(assembly) || !Array.isArray(assembly.modules)) continue;
        for (var m = 0; m < assembly.modules.length; m += 1) {
          var module_ = assembly.modules[m];
          if (!isPlainObject(module_) || !isPlainObject(module_.construction)) continue;
          var keys = Object.keys(module_.construction).sort();
          for (var k = 0; k < keys.length; k += 1) {
            var parameter = keys[k];
            cells.push({
              target_path: '$.assemblies[' + a + '].modules[' + m + '].construction.' + parameter,
              parameter: parameter,
              cell: module_.construction[parameter]
            });
          }
        }
      }
      return cells;
    }
    
    function makeClarificationQuestion(targetPath, state, options) {
      var reason = state === 'MISSING' ? 'MISSING_REQUIRED_VALUE' : state === 'CONFLICT' ? 'UNRESOLVED_CONFLICT' : 'CONFIRMATION_REQUIRED';
      return {
        Question_id: makeQuestionId(targetPath, reason),
        Target_path: targetPath,
        Reason: reason,
        Current_state: state,
        Options: Array.isArray(options) ? options.slice() : []
      };
    }
    
    function hasConstructionValue(value) {
      return value !== undefined && value !== null && value !== '';
    }
    
    function sortedUniqueNumbers(values) {
      var seen = {};
      var out = [];
      for (var i = 0; i < values.length; i += 1) {
        var value = values[i];
        if (isNumber(value) && !Object.prototype.hasOwnProperty.call(seen, value)) {
          seen[value] = true;
          out.push(value);
        }
      }
      out.sort(function (left, right) { return left - right; });
      return out;
    }
    
    function clarifyDraft(draft) {
      var cells = collectDimensionCells(draft);
      var constructionCells = collectConstructionCells(draft);
    
      var understood = [];
      var missing = [];
      var conflicts = [];
      var defaultCandidates = [];
      var blockers = [];
      var questions = [];
    
      for (var i = 0; i < cells.length; i += 1) {
        var entry = cells[i];
        var targetPath = entry.target_path;
        var cell = entry.cell;
        var state = cell.state;
        var required = isRequiredDimension(targetPath);
    
        if (cell.source_type === 'DEFAULT_CANDIDATE' && cell.value !== undefined && cell.value !== null) {
          defaultCandidates.push({
            Target_path: targetPath,
            Value: cell.value,
            Evidence_id: cell.source_ref || null
          });
        }
    
        if (state === 'KNOWN') {
          if (isPositiveNumber(cell.value)) {
            understood.push({
              Target_path: targetPath,
              Value: cell.value,
              Selected_evidence_id: cell.source_ref || null
            });
          }
          continue;
        }
    
        if (state === 'MISSING') {
          missing.push({ Target_path: targetPath });
          if (required) {
            var missingReason = 'MISSING_REQUIRED_VALUE';
            blockers.push({ Target_path: targetPath, Reason: missingReason });
            questions.push(makeClarificationQuestion(targetPath, state, []));
          }
          continue;
        }
    
        if (state === 'CONFLICT') {
          var conflictOptions = sortedUniqueNumbers(Array.isArray(cell.options) ? cell.options : []);
          var conflictEvidence = [];
          for (var c = 0; c < conflictOptions.length; c += 1) {
            conflictEvidence.push({ Value: conflictOptions[c] });
          }
          var conflictRecord = {
            Target_path: targetPath,
            Options: conflictOptions,
            Evidence: conflictEvidence
          };
          if (isNonEmptyString(cell.source_ref)) conflictRecord.Source_ref = cell.source_ref;
          if (isNonEmptyString(cell.source_type)) conflictRecord.Source_type = cell.source_type;
          if (isNonEmptyString(cell.evidence_state)) conflictRecord.Evidence_state = cell.evidence_state;
          if (isNonEmptyString(cell.note)) conflictRecord.Note = cell.note;
          conflicts.push(conflictRecord);
    
          var conflictReason = 'UNRESOLVED_CONFLICT';
          blockers.push({ Target_path: targetPath, Reason: conflictReason });
          questions.push(makeClarificationQuestion(targetPath, state, conflictOptions));
          continue;
        }
    
        if (state === 'NEEDS_CONFIRMATION') {
          var confirmReason = 'CONFIRMATION_REQUIRED';
          var confirmOptions = [];
          if (cell.source_type === 'DEFAULT_CANDIDATE' && cell.value !== undefined && cell.value !== null) {
            confirmOptions = [cell.value];
          }
          questions.push({
            Question_id: makeQuestionId(targetPath, confirmReason),
            Target_path: targetPath,
            Reason: confirmReason,
            Current_state: state,
            Options: confirmOptions
          });
          if (required) blockers.push({ Target_path: targetPath, Reason: confirmReason });
        }
      }
    
      for (var j = 0; j < constructionCells.length; j += 1) {
        var constructionEntry = constructionCells[j];
        var constructionCell = constructionEntry.cell;
        if (!isPlainObject(constructionCell)) continue;
        var constructionPath = constructionEntry.target_path;
        if (constructionCell.source_type === 'DEFAULT_CANDIDATE' && hasConstructionValue(constructionCell.value)) {
          defaultCandidates.push({
            Target_path: constructionPath,
            Value: constructionCell.value,
            Evidence_id: constructionCell.source_ref || null
          });
        }
        if (constructionCell.state === 'KNOWN') {
          if (hasConstructionValue(constructionCell.value)) {
            understood.push({
              Target_path: constructionPath,
              Value: constructionCell.value,
              Selected_evidence_id: constructionCell.source_ref || null
            });
          }
        } else if (constructionCell.state === 'MISSING') {
          missing.push({ Target_path: constructionPath });
          blockers.push({ Target_path: constructionPath, Reason: 'MISSING_REQUIRED_VALUE' });
          questions.push(makeClarificationQuestion(constructionPath, constructionCell.state, []));
        } else if (constructionCell.state === 'CONFLICT') {
          var constructionOptions = Array.isArray(constructionCell.options) ? constructionCell.options.slice() : [];
          conflicts.push({
            Target_path: constructionPath,
            Options: constructionOptions,
            Evidence: constructionOptions.map(function (value) { return { Value: value }; })
          });
          blockers.push({ Target_path: constructionPath, Reason: 'UNRESOLVED_CONFLICT' });
          var conflictQuestion = makeClarificationQuestion(constructionPath, constructionCell.state, constructionOptions);
          conflictQuestion.Default_value = constructionCell.value === undefined ? null : constructionCell.value;
          conflictQuestion.Default_source_ref = constructionCell.source_ref || null;
          questions.push(conflictQuestion);
        } else if (constructionCell.state === 'NEEDS_CONFIRMATION') {
          var constructionOptions = constructionCell.source_type === 'DEFAULT_CANDIDATE' && hasConstructionValue(constructionCell.value)
            ? [constructionCell.value]
            : [];
          var constructionQuestion = makeClarificationQuestion(constructionPath, constructionCell.state, constructionOptions);
          constructionQuestion.Default_value = constructionCell.value === undefined ? null : constructionCell.value;
          constructionQuestion.Default_source_ref = constructionCell.source_ref || null;
          questions.push(constructionQuestion);
          if (constructionCell.source_type === 'DEFAULT_CANDIDATE' && hasConstructionValue(constructionCell.value)) {
            blockers.push({ Target_path: constructionPath, Reason: 'CONFIRMATION_REQUIRED' });
          }
        }
      }
    
      return {
        Understood: sortByTargetPath(understood),
        Missing: sortByTargetPath(missing),
        Conflicts: sortByTargetPath(conflicts),
        Default_candidates: sortByTargetPath(defaultCandidates),
        Blockers: sortByTargetPath(blockers),
        Questions: sortByTargetPath(questions)
      };
    }
    
    var fusion = require('./fusion.js');
    var confirmation = require('./confirmation.js');
      var constructionAdapter = require('./construction_adapter.js');
      var pipeline = require('./pipeline.js');
      var constructionDefaults = require('./construction_defaults.js');
    
    module.exports = {
      EVIDENCE_STATES: EVIDENCE_STATES,
      EVIDENCE_SOURCE_TYPES: EVIDENCE_SOURCE_TYPES,
      DRAFT_CELL_STATES: DRAFT_CELL_STATES,
      DIMENSION_EVIDENCE_STATES: DIMENSION_EVIDENCE_STATES,
      DRAFT_SCHEMA_VERSION: DRAFT_SCHEMA_VERSION,
      CONFIRMED_SCHEMA_VERSION: CONFIRMED_SCHEMA_VERSION,
      CONFIRMED_STATUS: CONFIRMED_STATUS,
      validateEvidence: validateEvidence,
      validateDraft: validateDraft,
      buildConfirmedConfiguration: buildConfirmedConfiguration,
      clarifyDraft: clarifyDraft,
      ClarifyDraft: clarifyDraft,
      fuseEvidence: fusion.fuseEvidence,
      FuseEvidence: fusion.fuseEvidence,
      buildDynamicBrief: confirmation.buildDynamicBrief,
      BuildDynamicBrief: confirmation.BuildDynamicBrief,
      applyConfirmationAnswers: confirmation.applyConfirmationAnswers,
      ApplyConfirmationAnswers: confirmation.ApplyConfirmationAnswers,
      runConstructionFromDraft: constructionAdapter.runConstructionFromDraft,
      RunConstructionFromDraft: constructionAdapter.RunConstructionFromDraft,
      runStage10Pipeline: pipeline.runStage10Pipeline,
      RunStage10Pipeline: pipeline.RunStage10Pipeline,
      resolveConstructionDefaults: constructionDefaults.resolveConstructionDefaults,
      ResolveConstructionDefaults: constructionDefaults.ResolveConstructionDefaults
    };
    
  });

  define_("/src/input-understanding/pipeline.js", function(module, exports, require) {
    'use strict';
    
    function getStage10() {
      return require('./index.js');
    }
    
    function getVision() {
      return require('./vision.js');
    }
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function isNonEmptyString(value) {
      return typeof value === 'string' && value.length > 0;
    }
    
    function issue(code, status, message, path) {
      return {
        code: code,
        status: status,
        message: message,
        path: path || null,
        source_rule: null
      };
    }
    
    var MODULE_DIMENSION_PATTERN = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.dimensions\.(width_mm|height_mm|depth_mm)$/;
    var MODULE_CONSTRUCTION_PATTERN = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.construction\.[A-Za-z0-9_]+$/;
    var ASSEMBLY_DIMENSION_PATTERN = /^assemblies\[(\d+)\]\.(overall_width_mm|overall_depth_mm|finished_height_mm)$/;
    var GLOBAL_DIMENSION_PATTERN = /^global_dimensions\.(finished_worktop_height_mm|toe_kick_height_mm|countertop_thickness_mm)$/;
    
    function resolvesToDraftCell(targetPath) {
      if (!isNonEmptyString(targetPath)) {
        return false;
      }
      return MODULE_DIMENSION_PATTERN.test(targetPath) ||
        MODULE_CONSTRUCTION_PATTERN.test(targetPath) ||
        ASSEMBLY_DIMENSION_PATTERN.test(targetPath) ||
        GLOBAL_DIMENSION_PATTERN.test(targetPath);
    }
    
    function snapshotInput(input) {
      return JSON.stringify(input);
    }
    
    function runStage10Pipeline(input) {
      var stage10 = getStage10();
      var vision = getVision();
    
      if (!isPlainObject(input)) {
        return {
          Ok: false,
          Evidence: [],
          Draft: null,
          Clarification: null,
          Brief: null,
          Confirmation_result: null,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: [issue('PIPELINE_INPUT_INVALID', 'VALIDATION_ERROR', 'Pipeline input must be an object.', '$')]
        };
      }
    
      var draft = input.Draft;
      var inputEvidence = Array.isArray(input.Evidence) ? input.Evidence : [];
      var visionInput = input.Vision;
      var confirmationAnswers = input.Confirmation_answers;
      var profile = input.Profile;
      var benchmarkReference = input.Benchmark_reference;
    
      var inputSnapshot = snapshotInput(input);
    
      var issues = [];
    
      if (!isPlainObject(draft)) {
        issues.push(issue('PIPELINE_DRAFT_MISSING', 'VALIDATION_ERROR', 'Pipeline input requires a Draft object.', '$.Draft'));
        return {
          Ok: false,
          Evidence: [],
          Draft: null,
          Clarification: null,
          Brief: null,
          Confirmation_result: null,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: issues
        };
      }
    
      var draftValidation = stage10.validateDraft(draft);
      if (draftValidation.length > 0) {
        return {
          Ok: false,
          Evidence: [],
          Draft: clone(draft),
          Clarification: null,
          Brief: null,
          Confirmation_result: null,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: draftValidation
        };
      }
    
      var visionEvidence = [];
      var visionEvidenceErrors = [];
    
      if (visionInput !== undefined && visionInput !== null) {
        if (!isPlainObject(visionInput)) {
          issues.push(issue('PIPELINE_VISION_INVALID', 'VALIDATION_ERROR', 'Vision must be an object.', '$.Vision'));
        } else {
          var imageInput = visionInput.Image_input;
          var provider = visionInput.Provider;
          if (imageInput === undefined || imageInput === null) {
            issues.push(issue('PIPELINE_VISION_IMAGE_MISSING', 'VALIDATION_ERROR', 'Vision requires Image_input.', '$.Vision.Image_input'));
          } else if (provider === undefined || provider === null) {
            issues.push(issue('PIPELINE_VISION_PROVIDER_MISSING', 'VALIDATION_ERROR', 'Vision requires Provider.', '$.Vision.Provider'));
          } else {
            var visionResult = vision.recognizeImage(imageInput, provider);
            if (visionResult && typeof visionResult.then === 'function') {
              issues.push(issue('PIPELINE_VISION_ASYNC_UNSUPPORTED', 'VALIDATION_ERROR', 'Local pipeline does not support async vision providers.', '$.Vision.Provider'));
            } else if (!visionResult.ok) {
              visionEvidenceErrors = visionResult.errors || [];
              for (var ve = 0; ve < visionEvidenceErrors.length; ve += 1) {
                issues.push({
                  code: visionEvidenceErrors[ve].code,
                  status: visionEvidenceErrors[ve].status,
                  message: visionEvidenceErrors[ve].message,
                  path: visionEvidenceErrors[ve].path,
                  source_rule: null
                });
              }
            } else {
              visionEvidence = visionResult.evidence || [];
            }
          }
        }
    
        if (issues.length > 0) {
          return {
            Ok: false,
            Evidence: [],
            Draft: clone(draft),
            Clarification: null,
            Brief: null,
            Confirmation_result: null,
            Confirmed_configuration: null,
            Construction_result: null,
            Issues: issues
          };
        }
      }
    
      var allEvidence = inputEvidence.slice();
      for (var v = 0; v < visionEvidence.length; v += 1) {
        allEvidence.push(visionEvidence[v]);
      }
    
      var evidenceValidation = stage10.validateEvidence(allEvidence);
      if (evidenceValidation.length > 0) {
        return {
          Ok: false,
          Evidence: [],
          Draft: clone(draft),
          Clarification: null,
          Brief: null,
          Confirmation_result: null,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: evidenceValidation
        };
      }
    
      var fusionEvidence = [];
      var unresolvableEvidence = [];
      for (var f = 0; f < allEvidence.length; f += 1) {
        if (resolvesToDraftCell(allEvidence[f].target_path)) {
          fusionEvidence.push(allEvidence[f]);
        } else {
          unresolvableEvidence.push(allEvidence[f]);
        }
      }
    
      var fusionResult;
      if (fusionEvidence.length > 0) {
        fusionResult = stage10.fuseEvidence(draft, fusionEvidence);
        if (!fusionResult.Ok) {
          return {
            Ok: false,
            Evidence: allEvidence,
            Draft: clone(draft),
            Clarification: null,
            Brief: null,
            Confirmation_result: null,
            Confirmed_configuration: null,
            Construction_result: null,
            Issues: fusionResult.Issues
          };
        }
      } else {
        fusionResult = { Ok: true, Draft: clone(draft), Issues: [] };
      }
    
      var fusedDraft = fusionResult.Draft;
    
      var clarification = stage10.clarifyDraft(fusedDraft);
      var brief = stage10.buildDynamicBrief(clarification);
    
      var hasBlockers = Array.isArray(brief.Blockers) && brief.Blockers.length > 0;
      var hasQuestions = Array.isArray(brief.Questions) && brief.Questions.length > 0;
      var hasConflicts = Array.isArray(brief.Conflicts) && brief.Conflicts.length > 0;
    
      var confirmationResult = null;
      var updatedDraft = fusedDraft;
      var confirmationEvidence = [];
    
      if (confirmationAnswers !== undefined && confirmationAnswers !== null) {
        if (!Array.isArray(confirmationAnswers)) {
          issues.push(issue('PIPELINE_CONFIRMATION_INVALID', 'VALIDATION_ERROR', 'Confirmation_answers must be an array.', '$.Confirmation_answers'));
        } else {
          confirmationResult = stage10.applyConfirmationAnswers(updatedDraft, brief, confirmationAnswers);
          if (!confirmationResult.Ok) {
            return {
              Ok: false,
              Evidence: allEvidence,
              Draft: clone(fusedDraft),
              Clarification: clarification,
              Brief: brief,
              Confirmation_result: confirmationResult,
              Confirmed_configuration: null,
              Construction_result: null,
              Issues: confirmationResult.Issues
            };
          }
          updatedDraft = confirmationResult.Draft;
          confirmationEvidence = confirmationResult.Evidence || [];
    
          var reclarification = stage10.clarifyDraft(updatedDraft);
          clarification = reclarification;
          brief = stage10.buildDynamicBrief(reclarification);
          hasBlockers = Array.isArray(brief.Blockers) && brief.Blockers.length > 0;
          hasQuestions = Array.isArray(brief.Questions) && brief.Questions.length > 0;
          hasConflicts = Array.isArray(brief.Conflicts) && brief.Conflicts.length > 0;
        }
    
        if (issues.length > 0) {
          return {
            Ok: false,
            Evidence: allEvidence.concat(confirmationEvidence),
            Draft: clone(updatedDraft),
            Clarification: clarification,
            Brief: brief,
            Confirmation_result: confirmationResult,
            Confirmed_configuration: null,
            Construction_result: null,
            Issues: issues
          };
        }
      }
    
      var fullEvidence = allEvidence.concat(confirmationEvidence);
    
      if (hasBlockers || hasQuestions || hasConflicts) {
        return {
          Ok: false,
          Evidence: fullEvidence,
          Draft: clone(updatedDraft),
          Clarification: clarification,
          Brief: brief,
          Confirmation_result: confirmationResult,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: issues
        };
      }
    
      var confirmedResult = stage10.buildConfirmedConfiguration(updatedDraft);
      if (!confirmedResult.ok) {
        return {
          Ok: false,
          Evidence: fullEvidence,
          Draft: clone(updatedDraft),
          Clarification: clarification,
          Brief: brief,
          Confirmation_result: confirmationResult,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: confirmedResult.issues
        };
      }
    
      var confirmed = confirmedResult.confirmed;
    
      var constructionResult = null;
      if (profile !== undefined && profile !== null) {
        var constructionAdapter = require('./construction_adapter.js');
        var adapterResult = constructionAdapter.runConstructionFromDraft(updatedDraft, profile, benchmarkReference);
        if (!adapterResult.Ok) {
          return {
            Ok: false,
            Evidence: fullEvidence,
            Draft: clone(updatedDraft),
            Clarification: clarification,
            Brief: brief,
            Confirmation_result: confirmationResult,
            Confirmed_configuration: clone(confirmed),
            Construction_result: null,
            Issues: adapterResult.Issues
          };
        }
        constructionResult = adapterResult.Construction_result;
        issues = adapterResult.Issues || [];
      }
    
      if (snapshotInput(input) !== inputSnapshot) {
        return {
          Ok: false,
          Evidence: fullEvidence,
          Draft: clone(updatedDraft),
          Clarification: clarification,
          Brief: brief,
          Confirmation_result: confirmationResult,
          Confirmed_configuration: clone(confirmed),
          Construction_result: constructionResult,
          Issues: [issue('PIPELINE_INPUT_MUTATED', 'VALIDATION_ERROR', 'Pipeline input was mutated during execution.', '$')]
        };
      }
    
      return {
        Ok: true,
        Evidence: fullEvidence,
        Draft: clone(updatedDraft),
        Clarification: clarification,
        Brief: brief,
        Confirmation_result: confirmationResult,
        Confirmed_configuration: clone(confirmed),
        Construction_result: constructionResult,
        Issues: issues
      };
    }
    
    module.exports = {
      runStage10Pipeline: runStage10Pipeline,
      RunStage10Pipeline: runStage10Pipeline,
      resolvesToDraftCell: resolvesToDraftCell
    };
  });

  define_("/src/input-understanding/vision.js", function(module, exports, require) {
    'use strict';
    
    var VISION_ENTITY_TYPES = [
      'BASE_CABINET',
      'WALL_CABINET',
      'TALL_CABINET',
      'SINK',
      'DISHWASHER',
      'HOB',
      'OVEN',
      'HOOD',
      'REFRIGERATOR',
      'ISLAND',
      'COUNTERTOP'
    ];
    
    var VISION_SOURCE_TYPES = ['VISION_ENTITY', 'IMAGE_TEXT'];
    var DIMENSION_UNITS = ['mm', 'cm', 'm'];
    
    function isNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }
    
    function isPositiveNumber(value) {
      return isNumber(value) && value > 0;
    }
    
    function isNonNegativeNumber(value) {
      return isNumber(value) && value >= 0;
    }
    
    function isNonEmptyString(value) {
      return typeof value === 'string' && value.length > 0;
    }
    
    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    
    function inEnum(value, allowed) {
      return allowed.indexOf(value) !== -1;
    }
    
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    
    function visionIssue(code, message, path) {
      return {
        code: code,
        status: 'VALIDATION_ERROR',
        message: message,
        path: path || null
      };
    }
    
    function resolveSourceRef(imageInput) {
      if (isNonEmptyString(imageInput)) {
        return imageInput;
      }
      if (isPlainObject(imageInput)) {
        if (isNonEmptyString(imageInput.source_ref)) {
          return imageInput.source_ref;
        }
        if (isNonEmptyString(imageInput.image_id)) {
          return imageInput.image_id;
        }
        if (isNonEmptyString(imageInput.id)) {
          return imageInput.id;
        }
      }
      return null;
    }
    
    function isValidConfidence(value) {
      return isNonNegativeNumber(value) && value <= 1;
    }
    
    function buildEntityTargetPath(entity, index) {
      if (isNonEmptyString(entity.target_path)) {
        return entity.target_path;
      }
      return 'vision.entities[' + index + ']';
    }
    
    function buildVisibleTextTargetPath(item, index) {
      if (isNonEmptyString(item.target_path)) {
        return item.target_path;
      }
      return 'vision.visible_text[' + index + ']';
    }
    
    function compareEvidence(a, b) {
      if (a.target_path < b.target_path) {
        return -1;
      }
      if (a.target_path > b.target_path) {
        return 1;
      }
      if (a.source_type < b.source_type) {
        return -1;
      }
      if (a.source_type > b.source_type) {
        return 1;
      }
      if (a.source_ref < b.source_ref) {
        return -1;
      }
      if (a.source_ref > b.source_ref) {
        return 1;
      }
      return 0;
    }
    
    function normalizeVisionObservation(rawObservation, sourceRef) {
      if (!isPlainObject(rawObservation)) {
        return {
          ok: false,
          evidence: [],
          errors: [visionIssue('VISION_OBSERVATION_INVALID', 'Raw vision observation must be an object.', '$')]
        };
      }
    
      var resolvedRef = null;
      if (isNonEmptyString(sourceRef)) {
        resolvedRef = sourceRef;
      } else if (isNonEmptyString(rawObservation.source_ref)) {
        resolvedRef = rawObservation.source_ref;
      } else if (isNonEmptyString(rawObservation.image_id)) {
        resolvedRef = rawObservation.image_id;
      }
    
      if (!isNonEmptyString(resolvedRef)) {
        return {
          ok: false,
          evidence: [],
          errors: [visionIssue('VISION_SOURCE_REF_MISSING', 'A non-empty source_ref is required to attribute vision evidence.', '$.source_ref')]
        };
      }
    
      var errors = [];
      var evidence = [];
    
      var entities = Array.isArray(rawObservation.entities) ? rawObservation.entities : [];
      for (var i = 0; i < entities.length; i += 1) {
        var entity = entities[i];
        var entPath = '$.entities[' + i + ']';
        if (!isPlainObject(entity)) {
          errors.push(visionIssue('VISION_ENTITY_INVALID', 'Vision entity must be an object.', entPath));
          continue;
        }
        if (!isNonEmptyString(entity.type) || !inEnum(entity.type, VISION_ENTITY_TYPES)) {
          errors.push(visionIssue('VISION_ENTITY_TYPE_UNKNOWN', 'Vision entity has an unknown entity_type.', entPath + '.type'));
          continue;
        }
        if (!isValidConfidence(entity.confidence)) {
          errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Vision entity confidence must be a number between 0 and 1.', entPath + '.confidence'));
          continue;
        }
        evidence.push({
          target_path: buildEntityTargetPath(entity, i),
          value: entity.type,
          source_type: 'VISION_ENTITY',
          confidence: entity.confidence,
          state: 'ACTIVE',
          source_ref: resolvedRef
        });
      }
    
      var visibleText = Array.isArray(rawObservation.visible_text) ? rawObservation.visible_text : [];
      for (var t = 0; t < visibleText.length; t += 1) {
        var item = visibleText[t];
        var textPath = '$.visible_text[' + t + ']';
        if (!isPlainObject(item)) {
          errors.push(visionIssue('VISION_TEXT_INVALID', 'Visible text item must be an object.', textPath));
          continue;
        }
        if (!isNonEmptyString(item.text)) {
          errors.push(visionIssue('VISION_TEXT_INVALID', 'Visible text item requires a non-empty text string.', textPath + '.text'));
          continue;
        }
        if (!isValidConfidence(item.confidence)) {
          errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Visible text confidence must be a number between 0 and 1.', textPath + '.confidence'));
          continue;
        }
        evidence.push({
          target_path: buildVisibleTextTargetPath(item, t),
          value: item.text,
          source_type: 'IMAGE_TEXT',
          confidence: item.confidence,
          state: 'ACTIVE',
          source_ref: resolvedRef
        });
      }
    
      var visibleDimensions = Array.isArray(rawObservation.visible_dimensions) ? rawObservation.visible_dimensions : [];
      for (var d = 0; d < visibleDimensions.length; d += 1) {
        var dim = visibleDimensions[d];
        var dimPath = '$.visible_dimensions[' + d + ']';
        if (!isPlainObject(dim)) {
          errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension must be an object.', dimPath));
          continue;
        }
        if (!isNonEmptyString(dim.target_path)) {
          errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a target_path.', dimPath + '.target_path'));
          continue;
        }
        if (!isPositiveNumber(dim.value)) {
          errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a positive numeric value.', dimPath + '.value'));
          continue;
        }
        if (!isNonEmptyString(dim.unit) || !inEnum(dim.unit, DIMENSION_UNITS)) {
          errors.push(visionIssue('VISION_DIMENSION_MALFORMED', 'Visible dimension requires a valid unit (mm, cm, m).', dimPath + '.unit'));
          continue;
        }
        if (!isValidConfidence(dim.confidence)) {
          errors.push(visionIssue('VISION_CONFIDENCE_INVALID', 'Visible dimension confidence must be a number between 0 and 1.', dimPath + '.confidence'));
          continue;
        }
        evidence.push({
          target_path: dim.target_path,
          value: { value: dim.value, unit: dim.unit },
          source_type: 'IMAGE_TEXT',
          confidence: dim.confidence,
          state: 'ACTIVE',
          source_ref: resolvedRef
        });
      }
    
      if (errors.length) {
        return { ok: false, evidence: [], errors: errors };
      }
    
      evidence.sort(compareEvidence);
    
      return { ok: true, evidence: evidence, errors: [] };
    }
    
    function recognizeImage(imageInput, visionProvider) {
      var sourceRef = resolveSourceRef(imageInput);
      if (!isNonEmptyString(sourceRef)) {
        return {
          ok: false,
          evidence: [],
          errors: [visionIssue('VISION_SOURCE_REF_MISSING', 'A non-empty image source_ref could not be resolved from imageInput.', '$.source_ref')]
        };
      }
      if (!isPlainObject(visionProvider) || typeof visionProvider.analyze !== 'function') {
        return {
          ok: false,
          evidence: [],
          errors: [visionIssue('VISION_PROVIDER_INVALID', 'visionProvider must expose an analyze(imageInput) function.', '$.visionProvider')]
        };
      }
      var raw = visionProvider.analyze(imageInput);
      if (raw && typeof raw.then === 'function') {
        return raw.then(function (obs) {
          return normalizeVisionObservation(obs, sourceRef);
        });
      }
      return normalizeVisionObservation(raw, sourceRef);
    }
    
    module.exports = {
      VISION_ENTITY_TYPES: VISION_ENTITY_TYPES,
      VISION_SOURCE_TYPES: VISION_SOURCE_TYPES,
      DIMENSION_UNITS: DIMENSION_UNITS,
      recognizeImage: recognizeImage,
      normalizeVisionObservation: normalizeVisionObservation,
      resolveSourceRef: resolveSourceRef
    };
  });

  define_("/src/runtime/predeployment_pipeline_v1.js", function(module, exports, require) {
    'use strict';
    
    var stage10Pipeline = require('../input-understanding/pipeline.js');
    var defaultsResolver = require('../input-understanding/construction_defaults.js');
    var costing = require('../costing/index.js');
    
    var STATUS = {
      NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
      READY: 'READY',
      COMPLETE: 'COMPLETE',
      PARTIAL: 'PARTIAL'
    };
    
    function clone(value) {
      if (value === undefined || value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(clone);
      var output = {};
      Object.keys(value).forEach(function (key) {
        output[key] = clone(value[key]);
      });
      return output;
    }
    
    function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
    function first(value, fallback) { return value === undefined || value === null ? fallback : value; }
    function problem(code, message, path) {
      return { code: code, status: 'VALIDATION_ERROR', message: message, path: path || null, source_rule: null };
    }
    
    function getTarget(draft, path) {
      var match = /^\$\.assemblies\[(\d+)\]\.modules\[(\d+)\]\.construction\.([A-Za-z0-9_]+)$/.exec(String(path || ''));
      if (!match || !draft || !Array.isArray(draft.assemblies)) return null;
      var assembly = draft.assemblies[Number(match[1])];
      var module_ = assembly && assembly.modules && assembly.modules[Number(match[2])];
      if (!module_) return null;
      if (!isObject(module_.construction)) module_.construction = {};
      return { module: module_, parameter: match[3] };
    }
    
    function addDefaultCandidates(draft, resolutions) {
      var output = clone(draft);
      (Array.isArray(resolutions) ? resolutions : []).slice().sort(function (a, b) {
        return String(a.Target_path).localeCompare(String(b.Target_path));
      }).forEach(function (resolution) {
        var target = getTarget(output, resolution.Target_path);
        if (!target || (target.module.construction[target.parameter] && target.module.construction[target.parameter].state === 'KNOWN')) return;
        if (resolution.resolution_mode === 'REQUIRED_QUESTION') {
          target.module.construction[target.parameter] = { state: 'MISSING' };
        } else {
          target.module.construction[target.parameter] = {
            state: 'NEEDS_CONFIRMATION',
            value: clone(resolution.value),
            source_type: 'DEFAULT_CANDIDATE',
            source_ref: resolution.source_ref,
            evidence_state: 'ALPHA_DEFAULT',
            note: resolution.description || 'Construction default candidate.'
          };
        }
      });
      return output;
    }
    
    function makeDefaultAnswers(brief, candidates, supplied) {
      var result = Array.isArray(supplied) ? supplied.map(clone) : [];
      var used = {};
      result.forEach(function (answer) { if (answer && answer.Target_path) used[answer.Target_path] = true; });
      (Array.isArray(candidates) ? candidates : []).forEach(function (candidate) {
        if (used[candidate.Target_path]) return;
        var question = (brief && brief.Questions || []).find(function (item) { return item.Target_path === candidate.Target_path; });
        if (!question) return;
        var candidateValue = candidate.Value === undefined ? candidate.value : candidate.Value;
        result.push({ Question_id: question.Question_id, Target_path: question.Target_path, Value: clone(candidateValue) });
        used[candidate.Target_path] = true;
      });
      return result;
    }
    
    function alphaCostingResult(constructionResult) {
      var output = clone(constructionResult);
      if (Array.isArray(output.Hardware)) {
        output.Hardware = output.Hardware.filter(function (item) {
          return !(item && item.item === 'DRAWER_MECHANISMS' && item.quantity === null && item.status === 'NOT_IMPLEMENTED');
        });
      }
      return output;
    }
    
    function runPredeploymentPipelineV1(input, options) {
      var opts = options || {};
      var errors = [];
      if (!isObject(input) || !isObject(opts)) return { Status: STATUS.PARTIAL, Stage10: null, Construction_defaults: null, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: [problem('INVALID_INPUT', 'Input and options must be objects.', '$')] };
      if (!Array.isArray(opts.ConstructionDefaults)) errors.push(problem('CONSTRUCTION_DEFAULTS_INVALID', 'ConstructionDefaults must be an array.', '$.ConstructionDefaults'));
      if (!Array.isArray(opts.PriceRows)) errors.push(problem('PRICE_ROWS_INVALID', 'PriceRows must be an array.', '$.PriceRows'));
      if (opts.VisionProvider && (!isObject(opts.VisionProvider) || typeof opts.VisionProvider.analyze !== 'function')) errors.push(problem('VISION_PROVIDER_INVALID', 'VisionProvider must expose analyze.', '$.VisionProvider'));
      if (errors.length) return { Status: STATUS.PARTIAL, Stage10: null, Construction_defaults: null, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: errors };
    
      var source = clone(input.Stage10 || input);
      var answersProvided = Array.isArray(source.Confirmation_answers) && source.Confirmation_answers.length > 0;
      if (opts.VisionProvider && !answersProvided) {
        if (!isObject(source.Vision)) source.Vision = {};
        source.Vision.Provider = opts.VisionProvider;
      }
      var defaults = defaultsResolver.resolveConstructionDefaults(source.Draft, opts.ConstructionDefaults);
      source.Draft = addDefaultCandidates(source.Draft, defaults.Results);
      var userAnswers = Array.isArray(source.Confirmation_answers) ? source.Confirmation_answers : [];
      var stageResult = stage10Pipeline.runStage10Pipeline(source);
      var result = { Status: STATUS.NEEDS_CLARIFICATION, Stage10: stageResult, Construction_defaults: defaults, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: clone(stageResult.Issues || []) };
      var questionCount = stageResult.Brief && Array.isArray(stageResult.Brief.Questions) ? stageResult.Brief.Questions.length : 0;
      if (!stageResult.Ok && questionCount && userAnswers.length) {
        source.Confirmation_answers = userAnswers.map(clone);
        stageResult = stage10Pipeline.runStage10Pipeline(source);
        result.Stage10 = stageResult;
        result.Issues = clone(stageResult.Issues || []);
      }
      if (!stageResult.Ok || !stageResult.Confirmed_configuration || !stageResult.Construction_result) return result;
    
      result.Confirmed_configuration = clone(stageResult.Confirmed_configuration);
      result.Construction_result = clone(stageResult.Construction_result);
      var constructionForCosting = alphaCostingResult(stageResult.Construction_result);
      var context = clone(first(opts.CalculationContext, input.CalculationContext || {}));
      if (!context.calculation_id && !context.Calculation_id) context.calculation_id = result.Confirmed_configuration.project_id + '_CALC';
      if (!context.timestamp && !context.Timestamp) context.timestamp = '2026-08-31T12:00:00.000Z';
      if (!context.project_name && !context.Project_name) context.project_name = result.Confirmed_configuration.project_id;
      var costingOptions = clone(opts.CostingOptions || {});
      var snapshotOptions = clone(costingOptions);
      snapshotOptions.created_at = first(snapshotOptions.created_at, context.timestamp || context.Timestamp);
      try {
        result.Price_snapshot = costing.buildPriceSnapshot(opts.PriceRows, snapshotOptions);
        result.Costing = costing.calculateCosting(constructionForCosting, result.Price_snapshot, costingOptions);
      } catch (error) {
        result.Status = STATUS.PARTIAL;
        result.Issues.push(problem('COSTING_ERROR', error.message, '$.Costing'));
        return result;
      }
      var bundleContext = clone(context);
      bundleContext.confirmed_configuration = result.Confirmed_configuration;
      bundleContext.construction_result = constructionForCosting;
      result.Sheets_bundle = costing.buildSheetsV1Bundle(bundleContext, result.Costing, result.Price_snapshot);
      result.Status = result.Costing.Status === 'COMPLETE' ? STATUS.COMPLETE : STATUS.PARTIAL;
      return result;
    }
    
    module.exports = { STATUS: STATUS, runPredeploymentPipelineV1: runPredeploymentPipelineV1, RunPredeploymentPipelineV1: runPredeploymentPipelineV1 };
    
  });

  return require_('/src/runtime/predeployment_pipeline_v1.js');
})();
function runActiveV1Pipeline(input, options){ return ACTIVE_V1_RUNTIME.runPredeploymentPipelineV1(input, options); }
