import type { CategoryContentMap } from "./types";

export const enCategoryContent: CategoryContentMap = {
  "regaly-i-systemy-skladowania": {
    slug: "regaly-i-systemy-skladowania",
    locale: "en",
    definition: "Racking systems and warehouse structures constitute key intralogistic infrastructure designed for the safe and organized storage of goods at multiple height levels. These systems are customized to load unit characteristics, rotation requirements, and warehouse building technical specifications.",
    applications: [
      "High-bay warehouses and distribution centers",
      "Buffer zones next to production lines",
      "Cold storage and freezers (requiring space optimization)",
      "Wholesalers and corporate archives"
    ],
    decisionFactors: [
      "Type of stored load units (EUR pallets, industrial pallets, long goods, cartons, non-standard items)",
      "Maximum load capacity per storage level and maximum load capacity of the racking column",
      "Required inventory rotation principle (LIFO - e.g. drive-in racking, FIFO - e.g. pallet flow racking, selective racking)",
      "Warehouse building dimensions, including clear height, structural column spacing, and floor load capacity",
      "Operating aisle width (AST) and compatibility with reach trucks, VNA trucks, or counterbalance forklifts",
      "Occupational safety requirements (upright protectors, backstop mesh panels, safety fencing)",
      "Need for future racking system expansion or integration with warehouse automation",
      "Technical condition and joints of the concrete floor slab affecting footplate anchoring"
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-paletowe",
        relationType: "parent_child",
        priority: 1,
        context: "Main group of racking systems for palletized storage"
      },
      {
        targetSlug: "regaly-polkowe-i-antresole",
        relationType: "parent_child",
        priority: 2,
        context: "Solutions for small parts storage and multi-level storage"
      },
      {
        targetSlug: "wozki-i-transport-wewnetrzny",
        relationType: "application_context",
        priority: 3,
        context: "Equipment used to operate racking systems"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Safety guards and protectors required by occupational safety standards for racking"
      }
    ]
  },
  "wozki-i-transport-wewnetrzny": {
    slug: "wozki-i-transport-wewnetrzny",
    locale: "en",
    definition: "Material handling and internal transport equipment are machines designed to move, lift, and stack load units inside logistics and production facilities. They range from simple manual hand pallet trucks to advanced mechanical forklifts and autonomous guided vehicles.",
    applications: [
      "Unloading and loading transport units at loading docks",
      "Horizontal transport of goods over long distances inside halls",
      "Operation of high-bay racking systems (reach trucks, VNA)",
      "Order picking in low and high storage zones",
      "Supplying production lines with components"
    ],
    decisionFactors: [
      "Maximum load weight (nominal capacity and residual capacity at maximum lift height) and load dimensions",
      "Drive type (lead-acid electric, lithium-ion, LPG/Diesel internal combustion, manual hydraulic)",
      "Environmental conditions (indoor use, outdoor use, cold storage/freezer, explosion-proof EX zones)",
      "Required working aisle based on forklift turning radius and transported pallet length",
      "Work intensity (number of shifts, need for fast battery exchange or opportunity charging)",
      "Surface type and wheels (polyurethane wheels for smooth floors, solid resilient or pneumatic wheels for uneven terrain)",
      "Occupational safety requirements and additional equipment (fork cameras, proximity radars, blue spot, speed limiters)",
      "Compatibility with existing infrastructure (clearance height of doorways, parameters of loading docks and ramps)"
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "wozki-widlowe-czolowe",
        relationType: "parent_child",
        priority: 1,
        context: "Classic counterbalance forklifts with combustion or electric drive"
      },
      {
        targetSlug: "wozki-unoszace-i-kompaktowe",
        relationType: "parent_child",
        priority: 2,
        context: "Electric and manual pallet trucks for horizontal transport"
      },
      {
        targetSlug: "regaly-i-systemy-skladowania",
        relationType: "compatibility",
        priority: 3,
        context: "Racking systems adapted to be operated by forklifts"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 4,
        context: "Safety mirrors, guardrails, and traffic zone marking for forklifts"
      }
    ]
  },
  "pojemniki-plastikowe-euro": {
    slug: "pojemniki-plastikowe-euro",
    locale: "en",
    definition: "Euro plastic containers are standardized transport and storage packaging whose dimensions are optimized for the logistics module based on EUR pallet dimensions (1200x800 mm). Made of high-density polyethylene (HDPE) or polypropylene (PP), they provide dimensional stability, chemical resistance, and mechanical durability in harsh industrial conditions.",
    applications: [
      "Storage and transport of parts on production lines",
      "Automated storage and retrieval systems (AS/RS, mini-load)",
      "Order packing and picking in the e-commerce sector",
      "Transport of food and pharmaceutical products (food-grade certified versions)"
    ],
    decisionFactors: [
      "External dimensions (standard modules: 400x300, 600x400, 800x600 mm) and height",
      "Wall and base design (solid for containment, perforated for ventilation, reinforced for heavy loads)",
      "Material type (scratch-resistant PP, temperature-resistant HDPE)",
      "Required accessories (drop-on lids, hinged lids, internal dividers)",
      "Adaptation for use on conveyor belts and roller tracks (silent base)"
    ],
    technicalParameters: [
      { label: "Standard specification", value: "Euro (DIN EN 13626 compliant)" },
      { label: "Available base dimensions", value: "300x200, 400x300, 600x400, 800x600 mm" },
      { label: "Material", value: "Polypropylene (PP) / High-density polyethylene (HDPE)" },
      { label: "Temperature resistance", value: "-20°C to +60°C (PP), -40°C to +70°C (HDPE)" },
      { label: "Maximum capacity", value: "from 15 kg to 50 kg (depending on base variant)" },
      { label: "Container base", value: "Smooth, ribbed, double (reinforced)" },
      { label: "Stackability", value: "Yes (structure allows stable stacking)" }
    ],
    faq: [
      {
        question: "Are Euro containers suitable for direct food contact?",
        answer: "Yes, variants made from virgin HDPE or PP raw materials have certificates permitting food contact. Containers made of recycled plastics (regranulates) should not be used for unpackaged food."
      },
      {
        question: "What is the difference between a reinforced base and a standard base?",
        answer: "A reinforced base (ribbed or double) prevents container deflection under heavy loads. This is crucial in automated conveyor warehouses, where base deflection above limits could jam the roller system."
      },
      {
        question: "Are Euro containers resistant to oils and chemicals?",
        answer: "Yes, polypropylene and polyethylene exhibit very high resistance to most acids, alkalis, oils, and industrial greases."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-i-kuwety",
        relationType: "parent_child",
        priority: 1,
        context: "Parent group of storage containers"
      },
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 2,
        context: "Shelving systems optimized for Euro container dimensions"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 3,
        context: "Containers used at picking and packing stations"
      }
    ]
  },
  "stoly-pakowe-i-kompletacyjne": {
    slug: "stoly-pakowe-i-kompletacyjne",
    locale: "en",
    definition: "Packing benches and picking stations are ergonomic industrial workstations designed to optimize the process of parcel packing, content verification, and shipment preparation. Their modular design allows integration with stretch film holders, carton shelves, scales, and IT systems.",
    applications: [
      "Packing and shipping areas in e-commerce warehouses",
      "Quality control stations on production lines",
      "Picking stations in distribution centers",
      "Courier parcel drop-off points"
    ],
    decisionFactors: [
      "Worktop dimensions adapted to the size of packed goods",
      "Height adjustment range (fixed, manual step-by-step, smooth electric under ergonomic standards)",
      "Mechanical durability of the worktop and frame load capacity",
      "Additional equipment: upper shelves for cartons, bubble wrap/stretch film holder, LED workstation lighting, power strips, monitor and scanner mount",
      "Integration with gravity or powered roller conveyors"
    ],
    technicalParameters: [
      { label: "Worktop width", value: "1200, 1600, 1800, 2000 mm" },
      { label: "Worktop depth", value: "700, 800, 900 mm" },
      { label: "Frame load capacity", value: "up to 300 kg (standard), up to 600 kg (heavy duty)" },
      { label: "Worktop type", value: "Laminated MDF, worktop with oil-resistant rubber, hardwood multiplex plywood" },
      { label: "Height adjustment", value: "Manual (750-1050 mm) or smooth electric" },
      { label: "Frame finish", value: "Powder coated (steel structure)" }
    ],
    inquiryChecklist: {
      description: "The checklist below applies only to custom-made, individual designs of packing benches and picking stations. It helps match ergonomic parameters and equipment to your specific warehouse processes:",
      groups: [
        {
          groupLabel: "Workstation and ergonomics",
          fields: [
            "Required width and depth of the worktop (matched to carton sizes)",
            "Height adjustment system (manual with locking bolts or electric with push button control)",
            "Work type at the station (continuous standing, sit-stand with an industrial stool, sitting)",
            "Required worktop cover (standard melamine laminate, thick multiplex plywood, ESD antistatic rubber, oil-resistant mat)"
          ]
        },
        {
          groupLabel: "Packing and picking process",
          fields: [
            "Expected volume and type of packed shipments (number of packages per hour)",
            "Maximum weight of packages assembled and weighed on the bench",
            "Method of supplying goods to the station (from Euro containers, directly from trolleys, from conveyor lines)",
            "Method of receiving finished packages (stacking on pallets, sliding onto receiving table, conveyor)"
          ]
        },
        {
          groupLabel: "Bench structure and accessories",
          fields: [
            "Desired configuration of upper shelves (shelves with carton dividers, shelves for documents)",
            "Packaging material dispensing systems (lower/upper holder for bubble wrap, corrugated paper, stretch film)",
            "Built-in equipment (integrated scale in the worktop, drawers for small accessories, sliding cutter for film)",
            "LED work lighting (mounted on a vertical frame with angle adjustment)"
          ]
        },
        {
          groupLabel: "Utilities and IT integration",
          fields: [
            "Required system mounts for IT devices (VESA monitor mount, keyboard mount, shelf for label printer)",
            "Power and network installation requirements (number of 230V sockets, RJ45 LAN sockets, USB ports)",
            "Integrated pneumatic connections (quick couplers for compressed air tools)",
            "Compatibility with roller lines (need to build in a ball transfer unit or directional rollers)"
          ]
        },
        {
          groupLabel: "Deployment and modularity",
          fields: [
            "Total number of planned packing stations in the given warehouse zone",
            "Possibility of future reconfiguration (requirement of modular structure based on perforated profiles)",
            "Scope of assembly (delivery of pre-assembled benches or on-site assembly by service team)",
            "Planned deployment schedule and expected commissioning date of workstations"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Can the packing bench be retrofitted with new accessories in the future?",
        answer: "Yes, due to the modular design of vertical perforated profiles, most accessories (shelves, mounts, lighting) can be installed or their height adjusted at any time."
      },
      {
        question: "When is it worth choosing a bench with electric height adjustment?",
        answer: "Electric adjustment is key in multi-shift work environments where people of different heights work at one station, or when the process requires frequent changes from sitting to standing position to maintain ergonomics."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "pojemniki-plastikowe-euro",
        relationType: "compatibility",
        priority: 1,
        context: "Euro containers as standard equipment of packing bench shelves"
      },
      {
        targetSlug: "antresole-i-podesty-magazynowe",
        relationType: "application_context",
        priority: 2,
        context: "Packing areas are frequently positioned on warehouse mezzanines"
      }
    ]
  },
  "antresole-i-podesty-magazynowe": {
    slug: "antresole-i-podesty-magazynowe",
    locale: "en",
    definition: "Warehouse mezzanines (work platforms) are self-supporting steel structures that allow full utilization of the clear height of a hall by creating additional storage levels or work zones. This solution multiplies the storage surface area without the need for expensive building extension.",
    applications: [
      "Multi-level small parts picking zones (e-commerce warehouses)",
      "Increasing storage space for bulky goods",
      "Assembly, production, or packing zones located above the main storage floor",
      "Office or social spaces elevated on a platform to save ground floor space"
    ],
    decisionFactors: [
      "Uniform load capacity of the platform (typically from 250 to 1000 kg/m²)",
      "Clear height of the hall (optimally above 5 meters for a single platform level)",
      "Column grid (span of the steel structure affecting free movement under the mezzanine)",
      "Floor slab parameters in the hall (point load capacity of the mezzanine column baseplates)",
      "Platform floor decking type (high-density P5 chipboard, welded mesh gratings)",
      "Occupational safety and fire regulations (mesh/swing loading gates, stairs with handrails, sprinkler installation)"
    ],
    technicalParameters: [
      { label: "Platform capacity", value: "250 - 1000+ kg/m²" },
      { label: "Structure material", value: "Hot-rolled steel or cold-formed steel sections" },
      { label: "Design standards", value: "Eurocode compliant (EN 1993)" },
      { label: "Decking type", value: "P5 chipboard, trapezoidal sheet with board, steel grating" },
      { label: "Clear height", value: "Customized individually (typically min. 2200 mm under the mezzanine)" },
      { label: "Edge protection", value: "System guardrails (handrail, knee rail, toe board)" },
      { label: "Loading gates", value: "Sliding, tilting (safety lock gates protecting operator)" }
    ],
    inquiryChecklist: {
      description: "For the preparation of a complete engineering concept, structural calculations, and budget estimation of the warehouse mezzanine, please collect and provide the following technical data of the facility:",
      groups: [
        {
          groupLabel: "Dimensions and spatial layout of the hall",
          fields: [
            "Planned external dimensions of the mezzanine (width x length in meters)",
            "Exact clear height of the hall (from finished floor level to the lowest element of the roof structure or installations)",
            "Required clear height under the mezzanine structure (free space for pedestrian or forklift movement)",
            "Mezzanine location in the hall (free-standing, in a corner, adjacent to one or more walls)",
            "Any construction or installation obstacles in the assembly zone (hall columns, air handling units, fire pipes, gates)"
          ]
        },
        {
          groupLabel: "Floor slab capacity and load requirements",
          fields: [
            "Desired uniform load capacity of the mezzanine floor (e.g. 300, 500, 800, or over 1000 kg/m²)",
            "Type of planned storage on the platform (shelving, palletized goods, manual pallet truck traffic)",
            "Allowable load capacity of the hall floor slab (thickness of the concrete slab, allowable point load of the column footplate in kN)",
            "Method of anchoring the structure to the ground (does the floor have underfloor heating, underground installations)",
            "Occurrence of specific point loads (e.g. heavy machinery, control cabinets, forklifts)"
          ]
        },
        {
          groupLabel: "Structure, equipment, and access",
          fields: [
            "Preferred spacing of support columns (is a wide span required for movement below or is a denser grid acceptable)",
            "Number of staircases and their preferred location for evacuation purposes",
            "Floor decking type (standard non-slip P5 chipboard, welded steel grating, checker plate)",
            "Number of pallet drop-off zones (delivery points of loads from a forklift)",
            "Type of safety gate at the pallet drop-off zone (tilting/cradle gate protecting the operator, sliding gate, safety chain)"
          ]
        },
        {
          groupLabel: "Safety, fire protection, and formalities",
          fields: [
            "Required safety barriers and guardrails (standard height 1100 mm, toe board, knee rail)",
            "Fire protection requirements (fire resistance class of the structure R30, R60, or no requirement)",
            "Integration with safety installations (need for a sprinkler system under the platform, emergency lighting)",
            "Verification of evacuation routes and distances to emergency exits from mezzanine levels",
            "Does the design require approval by an occupational safety and fire protection expert before installation"
          ]
        },
        {
          groupLabel: "Operations and deployment conditions",
          fields: [
            "Planned work shift pattern on the mezzanine (single-shift, multi-shift with high intensity)",
            "Possibility of conducting installation works during normal warehouse operations (phased assembly)",
            "Availability of space for unloading and storing structural elements before and during installation",
            "Requirement of using specialized equipment for installation (e.g. forklifts, scissor lifts with specific drive types)",
            "Expected start date of installation works and planned operational launch date of the mezzanine"
          ]
        }
      ]
    },
    faq: [
      {
        question: "Does building a mezzanine require a building permit?",
        answer: "Self-supporting warehouse platforms anchored only to the floor slab are treated as interior fixtures/structures. They typically do not require a building permit under building regulations (they do not alter the building envelope) as long as they do not interfere with the hall load-bearing structure. However, notification and project approval from occupational safety and fire protection experts are required."
      },
      {
        question: "What platform floor decking is best?",
        answer: "The most popular and economical solution is high-density P5 chipboard (often with a white underside to reflect light). For strict fire safety requirements, steel mesh gratings (allowing water penetration from roof sprinklers) or trapezoidal sheet metal covered with fire-resistant board are used."
      },
      {
        question: "Can manual hand pallet trucks be operated on the mezzanine?",
        answer: "Yes, provided the mezzanine is designed for appropriate dynamic and point loads (typically min. 500 kg/m² and appropriate decking resistant to wheel pressure, e.g. P5 board covered with sheet metal or plywood)."
      }
    ],
    relatedCategoryEdges: [
      {
        targetSlug: "regaly-polkowe-metalowe",
        relationType: "compatibility",
        priority: 1,
        context: "Shelving systems installed on mezzanine levels"
      },
      {
        targetSlug: "stoly-pakowe-i-kompletacyjne",
        relationType: "application_context",
        priority: 2,
        context: "Picking and packing workstations positioned on the mezzanine"
      },
      {
        targetSlug: "systemy-bezpieczenstwa-i-oznakowanie",
        relationType: "safety_dependency",
        priority: 3,
        context: "Safety handrails, mesh screens, and guardrails"
      }
    ]
  }
};
