import type { GlossaryContentMap } from "./types";

export const enGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "Euro container",
    shortDefinition: "A standardized plastic transport and storage container dimensioned to fit optimally on standard pallet modules.",
    definition: [
      "Euro containers (also known as Euro stacking containers) are standard load units in warehouse logistics, retail distribution, and industrial manufacturing. Their external dimensions are standardized based on the 1200x800 mm logistic module (footprint of a standard Euro pallet), enabling optimal space utilization during transport and storage.",
      "They are typically manufactured from high-density polyethylene (HDPE) or polypropylene (PP), which provides appropriate mechanical strength, crack resistance, and resistance to selected chemical substances. The structural design allows safe stacking of loaded containers according to the manufacturer's recommended load limits."
    ],
    applications: [
      "Parts storage and transport along manufacturing assembly lines",
      "Order picking and packing in distribution centers and e-commerce hubs",
      "Automated small parts storage systems (containerized mini-load systems)",
      "Safe food-grade transport and handling (using certified food-safe versions)"
    ],
    synonyms: ["Euro stacking box", "Euro crate", "Plastic Euro container"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "What is the difference between a reinforced base and a standard base in Euro containers?",
        answer: "A reinforced base (such as a ribbed base) reduces sagging under heavy point loads. This feature is commonly used in automated warehouses and roller conveyor systems, where excessive base deflection could affect the smooth operation of the transport system."
      },
      {
        question: "Are Euro containers suitable for automated industrial washing?",
        answer: "Yes, PP and HDPE plastics can be washed in industrial washing systems. The water temperature and cleaning agents used should comply with the manufacturer's technical specifications and material standards."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Pallet racking",
    shortDefinition: "A storage system designed to support palletized goods in a multi-level layout.",
    definition: [
      "Pallet racking systems (primarily selective single-deep racks) form a key component of many modern warehouses. They provide direct access to unit loads and allow warehouses to utilize their vertical space. The system consists of vertical frames and horizontal load beams on which the pallets rest.",
      "Designing, installing, and operating pallet racking requires adherence to relevant safety standards (such as EN 15635), regular technical inspections, and the implementation of appropriate safety protections to shield the uprights from forklift impacts in work areas."
    ],
    applications: [
      "Multi-level pallet storage warehouses and logistics hubs",
      "Building material distributors and industrial warehouses",
      "Buffer zones and staging areas in shipping docks",
      "Cold storage facilities requiring optimal cubic space utilization"
    ],
    synonyms: ["High-bay racking", "Selective pallet rack", "Industrial racking"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "What are the most common types of pallet rack damage?",
        answer: "The most common damage occurs on the lower parts of the vertical uprights and diagonal bracing, typically caused by forklift collisions during maneuvering. Implementing column protectors is standard practice to reduce this risk."
      },
      {
        question: "Is it permissible to alter beam levels on a pallet rack independently?",
        answer: "Modifying the height of load levels alters the stability calculation and load capacity of the racking system. Any changes require prior verification and approval from the manufacturer or a qualified structural engineer."
      }
    ]
  },
  "antresola-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Warehouse mezzanine",
    shortDefinition: "A steel structure that creates additional raised floor levels above the main floor, increasing usable operational space.",
    definition: [
      "A warehouse mezzanine (also referred to as a structural steel work platform) is a system designed to utilize the vertical space of high-ceilinged industrial halls. It creates additional floor levels that can accommodate picking zones, packing areas, assembly lines, or secondary storage.",
      "The structure is supported by steel columns, primary beams, and secondary purlins. The decking is commonly made of heavy-duty particle boards (such as P5 tongue-and-groove boards, often fire-retardant) or steel gratings, which allow ventilation and facilitate sprinkler system performance."
    ],
    applications: [
      "Increasing picking zones in e-commerce fulfillment centers (multi-tier structures)",
      "Temporary staging and storage areas for light or bulky goods",
      "Creating overhead assembly lines or manufacturing work zones",
      "Building modular offices or breakrooms on the mezzanine floor inside production halls"
    ],
    synonyms: ["Industrial mezzanine", "Storage platform", "Steel work platform"],
    relatedTerms: ["kompletacja-zamowien", "stol-pakowy"],
    relatedCategories: ["antresole-i-podesty-magazynowe"],
    faq: [
      {
        question: "Does the installation of a steel mezzanine require a building permit?",
        answer: "The required procedure depends on the specific project. Formal, structural, slab-capacity and fire-safety reviews may be required depending on the design, installation method, intended use, building and local regulations. The scope should be confirmed with the appropriate specialists or authority."
      },
      {
        question: "What is the typical load capacity of a warehouse mezzanine?",
        answer: "Typical mezzanine load capacities generally range from 250 kg/m² to 1000 kg/m² and are engineered specifically based on the intended use, such as hand pallet truck traffic, shelving layouts, or specific point loads."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Packing table",
    shortDefinition: "A workstation equipped with integrated holders for packing materials, designed to support parcel inspection and packing.",
    definition: [
      "Packing tables and packing workstations are essential components of shipping areas in distribution centers, particularly in e-commerce logistics. They are designed to streamline order processing and support operator ergonomics through organized layouts and convenient access to tools.",
      "The modular design of these stations allows customization for specific packing workflows. Optional accessories include overhead shelves for cardboard cartons, roll dispensers for bubble wrap or paper, brackets for monitors and label printers, and task lighting."
    ],
    applications: [
      "Courier shipping and parcel packing stations in e-commerce fulfillment",
      "Quality control inspection points prior to customer shipping",
      "Assembly and packaging workstations in manufacturing plants",
      "Consolidation and sorting hubs in courier terminals"
    ],
    synonyms: ["Packing station", "Pack table", "Parcel packing bench"],
    relatedTerms: ["pojemnik-euro", "kompletacja-zamowien"],
    relatedCategories: ["stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "What are the optimal dimensions for a packing table countertop?",
        answer: "In typical configurations, the countertop width ranges from 1600 to 1800 mm, with a depth of approximately 800 mm. This space comfortably accommodates standard shipping boxes while keeping packing materials within easy reach."
      },
      {
        question: "Why should a packing station feature height adjustability?",
        answer: "Height adjustment (such as electric) allows the workstation to be tailored to the height of individual operators and supports sitting, standing, or sit-to-stand operations, reducing physical strain and supporting operational efficiency."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Forklift truck",
    shortDefinition: "A powered industrial vehicle equipped with a mast and forks to lift, transport, and stack palletized loads.",
    definition: [
      "Forklift trucks (also referred to as industrial counterbalanced lift trucks) are critical material handling machines used in warehouses, manufacturing plants, and construction yards. They are designed to lift loads vertically and maneuver in designated aisles and material paths.",
      "Depending on the power source, forklifts are divided into internal combustion engine trucks (LPG, Diesel) for outdoor operations, and quiet electric trucks (lead-acid or modern Li-Ion batteries) operating without local exhaust emissions during operation for indoor use. Specialized variants, such as Reach Trucks or Very Narrow Aisle (VNA) system trucks, can service pallet racks at significant heights."
    ],
    applications: [
      "Unloading and loading truck trailers, shipping containers, and flatbeds",
      "High-bay pallet rack operations (storing and retrieving unit loads)",
      "Horizontal transport of goods across large warehouse floors",
      "Order picking at high elevations using specialized picking platforms"
    ],
    synonyms: ["Forklift", "Lift truck", "Fork truck"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "What characterizes a Reach Truck compared to a standard forklift?",
        answer: "The reach mechanism can reduce aisle-width requirements compared with many counterbalanced trucks. Actual requirements depend on the model, load, storage height and warehouse-layout design."
      },
      {
        question: "Why are lithium-ion batteries replacing lead-acid batteries in electric forklifts?",
        answer: "Lithium-ion batteries generally do not require water refilling and may support opportunity charging. Charging-area, ventilation, fire-safety and operating requirements depend on the battery technology, charging system, manufacturer documentation, risk assessment and local regulations."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Rack load capacity",
    shortDefinition: "The maximum allowable load weight that a racking structure can support per beam level or per entire upright frame column.",
    definition: [
      "Rack load capacity is a fundamental safety parameter in industrial warehousing. It is categorized into beam level capacity (the maximum weight that can be placed on a single pair of load beams or shelf) and bay capacity (the total maximum combined weight of all levels between two adjacent vertical upright frames, taking into account the beam spacing).",
      "Load capacities must be clearly displayed on load signs (load charts) installed at the end of each racking row. Overloading is a severe safety hazard that can cause structural failure and collapse. Calculations are based on static, uniformly distributed loads (UDL)."
    ],
    applications: [
      "Designing and engineering racking systems according to specific load weights",
      "Verifying structural safety parameters during regular expert inspections",
      "Planning optimal storage layouts in the warehouse based on pallet weights"
    ],
    synonyms: ["Safe working load", "Shelf load capacity", "Frame load capacity"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "What does UDL mean in the context of warehouse racking?",
        answer: "UDL stands for Uniformly Distributed Load, meaning the weight is spread evenly across the entire surface of the shelf or load beams. Racking structures are designed with this load distribution in mind; concentrated point loads can reduce structural capacity."
      },
      {
        question: "Where should rack load capacity signs be positioned?",
        answer: "Load signs must be permanently mounted in prominent, highly visible locations on the racking structure (e.g., at the end of every racking block), according to standard safety guidelines (such as EN 15635)."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Order picking",
    shortDefinition: "The process of retrieving specific items from storage locations to fulfill a customer order.",
    definition: [
      "Order picking is one of the most labor-intensive processes in warehouse logistics, which can represent a substantial portion of total warehouse operating costs. It involves retrieving items from inventory in quantities specified by a customer order and delivering them to the packing and shipping zone.",
      "Picking methods range from standard 'picker-to-goods' (where operators travel through the warehouse aisles) to automated 'goods-to-picker' (using conveyor systems, shuttles, or robots to bring goods to the workstation). Optimization technologies such as Pick-by-Light, Voice Picking, or WMS-calculated paths are used to increase throughput."
    ],
    applications: [
      "Fulfillment of retail and consumer orders in e-commerce logistics",
      "Assembly and kitting of components in the automotive and electronics industries",
      "B2B distribution of grocery and pharmaceutical orders to retail chains"
    ],
    synonyms: ["Picking", "Item picking", "Stock picking"],
    relatedTerms: ["pojemnik-euro", "stol-pakowy"],
    relatedCategories: ["pojemniki-plastikowe-euro", "stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "What is the difference between single-stage picking and two-stage picking?",
        answer: "In single-stage picking, the operator collects items directly for one specific order. In two-stage (batch) picking, the operator collects the total sum of items for multiple orders at once, and then divides them in a sorting zone into individual customer shipments."
      },
      {
        question: "How does a Warehouse Management System (WMS) optimize picking times?",
        answer: "A WMS automatically calculates the suggested picking path to reduce empty travel distance, batches orders with similar profiles, and guides workers through the optimal retrieval sequence."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Internal transport",
    shortDefinition: "The movement of raw materials, work-in-progress, and finished goods within a single industrial or warehouse facility.",
    definition: [
      "Internal transport (also called material handling or intralogistics) encompasses all processes related to moving goods within the boundaries of a facility. It integrates receiving, storage, production, and shipping, using a wide range of auxiliary handling equipment.",
      "The intralogistics infrastructure ranges from simple manual equipment (such as hand pallet jacks) to complex automated systems, including roller and belt conveyors, vertical lifts, and driverless vehicles (AGVs/AMRs) capable of autonomous navigation."
    ],
    applications: [
      "Transporting raw materials from receiving docks to manufacturing lines",
      "Transferring picked orders to packing and consolidation zones",
      "Automatic handling of pallets on multi-tier mezzanines using vertical lifts",
      "Cross-docking and pallet staging in dock areas"
    ],
    synonyms: ["Intralogistics", "Material handling", "Material flow"],
    relatedTerms: ["wozek-widlowy", "pojemnik-euro"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "What is the difference between Autonomous Mobile Robots (AMRs) and traditional AGVs?",
        answer: "AGVs typically follow predefined paths (e.g., using magnetic tape or induction loops), while AMRs often use spatial mapping for more flexible route planning. Actual obstacle bypass and stopping capabilities depend on the specific manufacturer's safety system and system configuration."
      },
      {
        question: "What are the primary benefits of automating internal material transport?",
        answer: "Automation can support process repeatability, reduce manual handling steps, and increase material flow control. Implementation requires detailed process analysis, safety assessment of shared workspaces, and planning for system availability and maintenance."
      }
    ]
  }
};
