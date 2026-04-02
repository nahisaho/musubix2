/**
 * Virtual Project Fixtures — 16 sample SDD projects
 *
 * Data-only definitions (no filesystem side-effects).
 * Each project carries sample requirements (EARS patterns),
 * design specs, and tasks so the rest of the system can
 * demonstrate traceability without touching real directories.
 */

export interface VirtualProject {
  id: string;
  name: string;
  nameJa: string;
  domain: string;
  description: string;
  requirements: Array<{ id: string; text: string; pattern: string }>;
  designs: Array<{ id: string; title: string; reqIds: string[] }>;
  tasks: Array<{ id: string; title: string; phase: string; status: string }>;
}

export const VIRTUAL_PROJECTS: VirtualProject[] = [
  // 1. pet-clinic
  {
    id: 'pet-clinic',
    name: 'Pet Clinic Reservation',
    nameJa: 'ペットクリニック予約管理',
    domain: 'pet-clinic',
    description: 'Reservation management system for a veterinary clinic.',
    requirements: [
      { id: 'REQ-PC-001', text: 'When a pet owner requests an appointment, the system shall display available time slots.', pattern: 'event-driven' },
      { id: 'REQ-PC-002', text: 'The system shall store pet medical history for each registered pet.', pattern: 'ubiquitous' },
      { id: 'REQ-PC-003', text: 'If the requested slot is unavailable, the system shall suggest the nearest alternatives.', pattern: 'unwanted-behavior' },
      { id: 'REQ-PC-004', text: 'While a veterinarian is on leave, the system shall not allow bookings for that vet.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-PC-001', title: 'Appointment Booking Module', reqIds: ['REQ-PC-001', 'REQ-PC-003'] },
      { id: 'DES-PC-002', title: 'Pet Medical Record Store', reqIds: ['REQ-PC-002'] },
      { id: 'DES-PC-003', title: 'Vet Schedule Manager', reqIds: ['REQ-PC-004'] },
    ],
    tasks: [
      { id: 'TSK-PC-001', title: 'Implement slot availability API', phase: 'implementation', status: 'todo' },
      { id: 'TSK-PC-002', title: 'Design pet record schema', phase: 'design', status: 'done' },
      { id: 'TSK-PC-003', title: 'Build alternative slot suggestion engine', phase: 'implementation', status: 'in-progress' },
    ],
  },

  // 2. parking
  {
    id: 'parking',
    name: 'Parking Management',
    nameJa: '駐車場管理システム',
    domain: 'parking',
    description: 'Automated parking lot management with real-time occupancy tracking.',
    requirements: [
      { id: 'REQ-PK-001', text: 'The system shall track real-time occupancy for each parking zone.', pattern: 'ubiquitous' },
      { id: 'REQ-PK-002', text: 'When a vehicle enters, the system shall record the license plate and entry time.', pattern: 'event-driven' },
      { id: 'REQ-PK-003', text: 'If the lot is full, the system shall display a "Full" indicator at the entrance.', pattern: 'unwanted-behavior' },
      { id: 'REQ-PK-004', text: 'While the barrier is raised, the system shall not process a new entry event.', pattern: 'state-driven' },
      { id: 'REQ-PK-005', text: 'Where the parking lot has EV chargers, the system shall reserve spots for electric vehicles.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-PK-001', title: 'Occupancy Tracking Service', reqIds: ['REQ-PK-001', 'REQ-PK-003'] },
      { id: 'DES-PK-002', title: 'Vehicle Entry/Exit Processor', reqIds: ['REQ-PK-002', 'REQ-PK-004'] },
      { id: 'DES-PK-003', title: 'EV Charger Reservation Module', reqIds: ['REQ-PK-005'] },
    ],
    tasks: [
      { id: 'TSK-PK-001', title: 'Implement occupancy counter', phase: 'implementation', status: 'done' },
      { id: 'TSK-PK-002', title: 'Integrate license plate recognition', phase: 'integration', status: 'todo' },
      { id: 'TSK-PK-003', title: 'Build entrance display controller', phase: 'implementation', status: 'todo' },
      { id: 'TSK-PK-004', title: 'Design EV reservation schema', phase: 'design', status: 'in-progress' },
    ],
  },

  // 3. library
  {
    id: 'library',
    name: 'Library Collection Management',
    nameJa: '図書館蔵書管理',
    domain: 'library',
    description: 'Book cataloging and lending management for a public library.',
    requirements: [
      { id: 'REQ-LB-001', text: 'The system shall maintain a catalog of all books with ISBN, title, and author.', pattern: 'ubiquitous' },
      { id: 'REQ-LB-002', text: 'When a patron borrows a book, the system shall record the due date.', pattern: 'event-driven' },
      { id: 'REQ-LB-003', text: 'If a book is overdue, the system shall send a reminder notification.', pattern: 'unwanted-behavior' },
      { id: 'REQ-LB-004', text: 'While a book is reserved, the system shall prevent other patrons from borrowing it.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-LB-001', title: 'Book Catalog Service', reqIds: ['REQ-LB-001'] },
      { id: 'DES-LB-002', title: 'Lending & Return Module', reqIds: ['REQ-LB-002', 'REQ-LB-003', 'REQ-LB-004'] },
    ],
    tasks: [
      { id: 'TSK-LB-001', title: 'Implement catalog CRUD', phase: 'implementation', status: 'done' },
      { id: 'TSK-LB-002', title: 'Build overdue notification job', phase: 'implementation', status: 'todo' },
      { id: 'TSK-LB-003', title: 'Design reservation lock mechanism', phase: 'design', status: 'in-progress' },
    ],
  },

  // 4. delivery
  {
    id: 'delivery',
    name: 'Delivery Tracking',
    nameJa: '配送追跡システム',
    domain: 'delivery',
    description: 'Package delivery tracking with real-time status updates.',
    requirements: [
      { id: 'REQ-DL-001', text: 'The system shall assign a unique tracking number to each shipment.', pattern: 'ubiquitous' },
      { id: 'REQ-DL-002', text: 'When the driver scans a package, the system shall update the delivery status.', pattern: 'event-driven' },
      { id: 'REQ-DL-003', text: 'If delivery fails, the system shall schedule a retry within 24 hours.', pattern: 'unwanted-behavior' },
      { id: 'REQ-DL-004', text: 'While a package is in transit, the system shall provide GPS location updates.', pattern: 'state-driven' },
      { id: 'REQ-DL-005', text: 'Where the recipient has opted in, the system shall send SMS notifications.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-DL-001', title: 'Shipment Lifecycle Manager', reqIds: ['REQ-DL-001', 'REQ-DL-002', 'REQ-DL-003'] },
      { id: 'DES-DL-002', title: 'GPS Tracking Integration', reqIds: ['REQ-DL-004'] },
      { id: 'DES-DL-003', title: 'Notification Dispatcher', reqIds: ['REQ-DL-005'] },
    ],
    tasks: [
      { id: 'TSK-DL-001', title: 'Implement tracking number generator', phase: 'implementation', status: 'done' },
      { id: 'TSK-DL-002', title: 'Build scan event processor', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-DL-003', title: 'Integrate GPS provider', phase: 'integration', status: 'todo' },
      { id: 'TSK-DL-004', title: 'Set up SMS gateway', phase: 'integration', status: 'todo' },
    ],
  },

  // 5. gym
  {
    id: 'gym',
    name: 'Gym Membership Management',
    nameJa: 'ジム会員管理',
    domain: 'gym',
    description: 'Member registration, class booking, and attendance tracking for a fitness gym.',
    requirements: [
      { id: 'REQ-GM-001', text: 'The system shall manage member profiles with contact info and membership tier.', pattern: 'ubiquitous' },
      { id: 'REQ-GM-002', text: 'When a member checks in, the system shall log attendance with a timestamp.', pattern: 'event-driven' },
      { id: 'REQ-GM-003', text: 'If a class reaches capacity, the system shall add the member to a waitlist.', pattern: 'unwanted-behavior' },
    ],
    designs: [
      { id: 'DES-GM-001', title: 'Member Profile Service', reqIds: ['REQ-GM-001'] },
      { id: 'DES-GM-002', title: 'Check-in & Attendance Tracker', reqIds: ['REQ-GM-002'] },
      { id: 'DES-GM-003', title: 'Class Booking Engine', reqIds: ['REQ-GM-003'] },
    ],
    tasks: [
      { id: 'TSK-GM-001', title: 'Implement member registration API', phase: 'implementation', status: 'done' },
      { id: 'TSK-GM-002', title: 'Build QR check-in flow', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-GM-003', title: 'Design waitlist algorithm', phase: 'design', status: 'todo' },
    ],
  },

  // 6. reservation
  {
    id: 'reservation',
    name: 'Restaurant Reservation',
    nameJa: 'レストラン予約',
    domain: 'reservation',
    description: 'Table reservation system for a restaurant chain.',
    requirements: [
      { id: 'REQ-RS-001', text: 'The system shall allow guests to reserve a table specifying date, time, and party size.', pattern: 'ubiquitous' },
      { id: 'REQ-RS-002', text: 'When a reservation is confirmed, the system shall send a confirmation email.', pattern: 'event-driven' },
      { id: 'REQ-RS-003', text: 'If the guest does not arrive within 15 minutes, the system shall release the table.', pattern: 'unwanted-behavior' },
      { id: 'REQ-RS-004', text: 'While a table is occupied, the system shall mark it as unavailable for new reservations.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-RS-001', title: 'Table Reservation Service', reqIds: ['REQ-RS-001', 'REQ-RS-004'] },
      { id: 'DES-RS-002', title: 'Confirmation Notifier', reqIds: ['REQ-RS-002'] },
      { id: 'DES-RS-003', title: 'No-Show Handler', reqIds: ['REQ-RS-003'] },
    ],
    tasks: [
      { id: 'TSK-RS-001', title: 'Implement reservation API', phase: 'implementation', status: 'done' },
      { id: 'TSK-RS-002', title: 'Build email confirmation flow', phase: 'implementation', status: 'done' },
      { id: 'TSK-RS-003', title: 'Design no-show timer', phase: 'design', status: 'in-progress' },
      { id: 'TSK-RS-004', title: 'Write integration tests', phase: 'testing', status: 'todo' },
    ],
  },

  // 7. clinic
  {
    id: 'clinic',
    name: 'Clinic Reception Management',
    nameJa: '診療所受付管理',
    domain: 'clinic',
    description: 'Patient reception and queue management for a medical clinic.',
    requirements: [
      { id: 'REQ-CL-001', text: 'The system shall register patients with insurance information.', pattern: 'ubiquitous' },
      { id: 'REQ-CL-002', text: 'When a patient arrives, the system shall assign a queue number.', pattern: 'event-driven' },
      { id: 'REQ-CL-003', text: 'If wait time exceeds 30 minutes, the system shall notify reception staff.', pattern: 'unwanted-behavior' },
      { id: 'REQ-CL-004', text: 'While a consultation is in progress, the system shall display the occupied status.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-CL-001', title: 'Patient Registration Module', reqIds: ['REQ-CL-001'] },
      { id: 'DES-CL-002', title: 'Queue Management System', reqIds: ['REQ-CL-002', 'REQ-CL-003'] },
      { id: 'DES-CL-003', title: 'Consultation Status Board', reqIds: ['REQ-CL-004'] },
    ],
    tasks: [
      { id: 'TSK-CL-001', title: 'Implement patient registration form', phase: 'implementation', status: 'done' },
      { id: 'TSK-CL-002', title: 'Build queue number dispenser', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-CL-003', title: 'Design wait-time alert system', phase: 'design', status: 'todo' },
    ],
  },

  // 8. real-estate
  {
    id: 'real-estate',
    name: 'Real Estate Property Management',
    nameJa: '不動産物件管理',
    domain: 'real-estate',
    description: 'Property listing and tenant management for a real estate agency.',
    requirements: [
      { id: 'REQ-RE-001', text: 'The system shall list properties with address, price, and floor plan.', pattern: 'ubiquitous' },
      { id: 'REQ-RE-002', text: 'When a tenant signs a lease, the system shall generate a contract record.', pattern: 'event-driven' },
      { id: 'REQ-RE-003', text: 'If rent payment is overdue by 7 days, the system shall send a payment reminder.', pattern: 'unwanted-behavior' },
      { id: 'REQ-RE-004', text: 'Where the property includes furnishing, the system shall track inventory items.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-RE-001', title: 'Property Listing Service', reqIds: ['REQ-RE-001'] },
      { id: 'DES-RE-002', title: 'Lease Contract Generator', reqIds: ['REQ-RE-002', 'REQ-RE-003'] },
      { id: 'DES-RE-003', title: 'Furnishing Inventory Tracker', reqIds: ['REQ-RE-004'] },
    ],
    tasks: [
      { id: 'TSK-RE-001', title: 'Implement property CRUD API', phase: 'implementation', status: 'done' },
      { id: 'TSK-RE-002', title: 'Build lease PDF generator', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-RE-003', title: 'Design rent reminder scheduler', phase: 'design', status: 'todo' },
      { id: 'TSK-RE-004', title: 'Create furnishing checklist UI', phase: 'implementation', status: 'todo' },
    ],
  },

  // 9. inventory
  {
    id: 'inventory',
    name: 'Inventory Management',
    nameJa: '在庫管理システム',
    domain: 'inventory',
    description: 'Warehouse inventory tracking with stock level alerts.',
    requirements: [
      { id: 'REQ-IN-001', text: 'The system shall track stock quantities per SKU across warehouses.', pattern: 'ubiquitous' },
      { id: 'REQ-IN-002', text: 'When stock falls below the reorder point, the system shall create a purchase order.', pattern: 'event-driven' },
      { id: 'REQ-IN-003', text: 'If a discrepancy is found during audit, the system shall flag the item for review.', pattern: 'unwanted-behavior' },
      { id: 'REQ-IN-004', text: 'While a stock transfer is in progress, the system shall lock the affected quantities.', pattern: 'state-driven' },
      { id: 'REQ-IN-005', text: 'Where barcode scanning is available, the system shall auto-populate item details.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-IN-001', title: 'Stock Tracking Engine', reqIds: ['REQ-IN-001', 'REQ-IN-004'] },
      { id: 'DES-IN-002', title: 'Reorder Automation Module', reqIds: ['REQ-IN-002'] },
      { id: 'DES-IN-003', title: 'Audit Discrepancy Handler', reqIds: ['REQ-IN-003', 'REQ-IN-005'] },
    ],
    tasks: [
      { id: 'TSK-IN-001', title: 'Implement stock ledger', phase: 'implementation', status: 'done' },
      { id: 'TSK-IN-002', title: 'Build reorder threshold engine', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-IN-003', title: 'Integrate barcode scanner SDK', phase: 'integration', status: 'todo' },
      { id: 'TSK-IN-004', title: 'Design audit workflow', phase: 'design', status: 'todo' },
    ],
  },

  // 10. project-mgmt
  {
    id: 'project-mgmt',
    name: 'Project Management',
    nameJa: 'プロジェクト管理',
    domain: 'project-mgmt',
    description: 'Task and milestone tracking for software development teams.',
    requirements: [
      { id: 'REQ-PM-001', text: 'The system shall organize tasks into projects with milestones and deadlines.', pattern: 'ubiquitous' },
      { id: 'REQ-PM-002', text: 'When a task is marked complete, the system shall update the project progress.', pattern: 'event-driven' },
      { id: 'REQ-PM-003', text: 'If a milestone deadline is missed, the system shall notify the project manager.', pattern: 'unwanted-behavior' },
    ],
    designs: [
      { id: 'DES-PM-001', title: 'Task & Milestone Service', reqIds: ['REQ-PM-001', 'REQ-PM-002'] },
      { id: 'DES-PM-002', title: 'Deadline Alert Module', reqIds: ['REQ-PM-003'] },
    ],
    tasks: [
      { id: 'TSK-PM-001', title: 'Implement task CRUD', phase: 'implementation', status: 'done' },
      { id: 'TSK-PM-002', title: 'Build Gantt chart view', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-PM-003', title: 'Design deadline notification system', phase: 'design', status: 'todo' },
      { id: 'TSK-PM-004', title: 'Write progress calculation tests', phase: 'testing', status: 'todo' },
    ],
  },

  // 11. e-learning
  {
    id: 'e-learning',
    name: 'E-Learning Platform',
    nameJa: 'eラーニングプラットフォーム',
    domain: 'e-learning',
    description: 'Online course delivery with progress tracking and quizzes.',
    requirements: [
      { id: 'REQ-EL-001', text: 'The system shall present courses as a sequence of lessons with multimedia content.', pattern: 'ubiquitous' },
      { id: 'REQ-EL-002', text: 'When a learner completes a lesson, the system shall mark it and unlock the next.', pattern: 'event-driven' },
      { id: 'REQ-EL-003', text: 'If a quiz score is below the passing threshold, the system shall suggest review material.', pattern: 'unwanted-behavior' },
      { id: 'REQ-EL-004', text: 'While an exam is in progress, the system shall disable navigation to other lessons.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-EL-001', title: 'Course Content Delivery', reqIds: ['REQ-EL-001', 'REQ-EL-002'] },
      { id: 'DES-EL-002', title: 'Quiz & Assessment Engine', reqIds: ['REQ-EL-003', 'REQ-EL-004'] },
    ],
    tasks: [
      { id: 'TSK-EL-001', title: 'Implement lesson sequencing', phase: 'implementation', status: 'done' },
      { id: 'TSK-EL-002', title: 'Build quiz scoring engine', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-EL-003', title: 'Design review recommendation algorithm', phase: 'design', status: 'todo' },
    ],
  },

  // 12. employee
  {
    id: 'employee',
    name: 'Employee Management',
    nameJa: '従業員管理',
    domain: 'employee',
    description: 'Employee records, attendance, and leave management.',
    requirements: [
      { id: 'REQ-EM-001', text: 'The system shall maintain employee profiles with department and role information.', pattern: 'ubiquitous' },
      { id: 'REQ-EM-002', text: 'When an employee submits a leave request, the system shall route it for approval.', pattern: 'event-driven' },
      { id: 'REQ-EM-003', text: 'If leave balance is insufficient, the system shall reject the request.', pattern: 'unwanted-behavior' },
      { id: 'REQ-EM-004', text: 'While an employee is on probation, the system shall restrict access to certain benefits.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-EM-001', title: 'Employee Profile Service', reqIds: ['REQ-EM-001'] },
      { id: 'DES-EM-002', title: 'Leave Management Workflow', reqIds: ['REQ-EM-002', 'REQ-EM-003'] },
      { id: 'DES-EM-003', title: 'Probation Access Controller', reqIds: ['REQ-EM-004'] },
    ],
    tasks: [
      { id: 'TSK-EM-001', title: 'Implement employee CRUD', phase: 'implementation', status: 'done' },
      { id: 'TSK-EM-002', title: 'Build leave approval workflow', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-EM-003', title: 'Design probation rule engine', phase: 'design', status: 'todo' },
      { id: 'TSK-EM-004', title: 'Write attendance report', phase: 'implementation', status: 'todo' },
    ],
  },

  // 13. household
  {
    id: 'household',
    name: 'Household Budget App',
    nameJa: '家計簿アプリ',
    domain: 'household',
    description: 'Personal finance tracking with budgeting and expense categorization.',
    requirements: [
      { id: 'REQ-HH-001', text: 'The system shall categorize transactions as income or expense with a category label.', pattern: 'ubiquitous' },
      { id: 'REQ-HH-002', text: 'When a new transaction is entered, the system shall update the running balance.', pattern: 'event-driven' },
      { id: 'REQ-HH-003', text: 'If spending in a category exceeds the budget, the system shall display a warning.', pattern: 'unwanted-behavior' },
    ],
    designs: [
      { id: 'DES-HH-001', title: 'Transaction Ledger', reqIds: ['REQ-HH-001', 'REQ-HH-002'] },
      { id: 'DES-HH-002', title: 'Budget Alert System', reqIds: ['REQ-HH-003'] },
    ],
    tasks: [
      { id: 'TSK-HH-001', title: 'Implement transaction entry form', phase: 'implementation', status: 'done' },
      { id: 'TSK-HH-002', title: 'Build category budget settings', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-HH-003', title: 'Design monthly summary report', phase: 'design', status: 'todo' },
    ],
  },

  // 14. ticketing
  {
    id: 'ticketing',
    name: 'Ticket Reservation',
    nameJa: 'チケット予約',
    domain: 'ticketing',
    description: 'Event ticket booking with seat selection and payment.',
    requirements: [
      { id: 'REQ-TK-001', text: 'The system shall display events with available seat maps.', pattern: 'ubiquitous' },
      { id: 'REQ-TK-002', text: 'When a user selects seats, the system shall hold them for 10 minutes.', pattern: 'event-driven' },
      { id: 'REQ-TK-003', text: 'If payment is not completed within the hold period, the system shall release the seats.', pattern: 'unwanted-behavior' },
      { id: 'REQ-TK-004', text: 'While seats are held, the system shall show them as temporarily unavailable to others.', pattern: 'state-driven' },
      { id: 'REQ-TK-005', text: 'Where accessible seating is required, the system shall offer wheelchair-accessible options first.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-TK-001', title: 'Seat Map & Selection UI', reqIds: ['REQ-TK-001', 'REQ-TK-005'] },
      { id: 'DES-TK-002', title: 'Seat Hold Timer Service', reqIds: ['REQ-TK-002', 'REQ-TK-003', 'REQ-TK-004'] },
    ],
    tasks: [
      { id: 'TSK-TK-001', title: 'Implement seat map renderer', phase: 'implementation', status: 'done' },
      { id: 'TSK-TK-002', title: 'Build seat hold mechanism', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-TK-003', title: 'Integrate payment gateway', phase: 'integration', status: 'todo' },
      { id: 'TSK-TK-004', title: 'Design accessible seating filter', phase: 'design', status: 'todo' },
    ],
  },

  // 15. iot-dashboard
  {
    id: 'iot-dashboard',
    name: 'IoT Dashboard',
    nameJa: 'IoTダッシュボード',
    domain: 'iot-dashboard',
    description: 'Real-time sensor data visualization and alerting for IoT devices.',
    requirements: [
      { id: 'REQ-IOT-001', text: 'The system shall display real-time sensor readings on a dashboard.', pattern: 'ubiquitous' },
      { id: 'REQ-IOT-002', text: 'When a sensor value exceeds a threshold, the system shall trigger an alert.', pattern: 'event-driven' },
      { id: 'REQ-IOT-003', text: 'If a device goes offline for more than 5 minutes, the system shall mark it as disconnected.', pattern: 'unwanted-behavior' },
      { id: 'REQ-IOT-004', text: 'While data ingestion is paused, the system shall buffer incoming messages.', pattern: 'state-driven' },
    ],
    designs: [
      { id: 'DES-IOT-001', title: 'Sensor Dashboard Renderer', reqIds: ['REQ-IOT-001'] },
      { id: 'DES-IOT-002', title: 'Threshold Alert Engine', reqIds: ['REQ-IOT-002', 'REQ-IOT-003'] },
      { id: 'DES-IOT-003', title: 'Message Buffer Service', reqIds: ['REQ-IOT-004'] },
    ],
    tasks: [
      { id: 'TSK-IOT-001', title: 'Implement WebSocket data stream', phase: 'implementation', status: 'done' },
      { id: 'TSK-IOT-002', title: 'Build threshold configuration UI', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-IOT-003', title: 'Design message buffering strategy', phase: 'design', status: 'todo' },
      { id: 'TSK-IOT-004', title: 'Write device health checker', phase: 'implementation', status: 'todo' },
    ],
  },

  // 16. api-gateway
  {
    id: 'api-gateway',
    name: 'API Gateway',
    nameJa: 'APIゲートウェイ',
    domain: 'api-gateway',
    description: 'Centralized API gateway with rate limiting, authentication, and routing.',
    requirements: [
      { id: 'REQ-AG-001', text: 'The system shall route incoming requests to backend services based on path configuration.', pattern: 'ubiquitous' },
      { id: 'REQ-AG-002', text: 'When a request exceeds the rate limit, the system shall return HTTP 429.', pattern: 'event-driven' },
      { id: 'REQ-AG-003', text: 'If authentication fails, the system shall return HTTP 401 with an error description.', pattern: 'unwanted-behavior' },
      { id: 'REQ-AG-004', text: 'While a backend service is unhealthy, the system shall route traffic to a fallback.', pattern: 'state-driven' },
      { id: 'REQ-AG-005', text: 'Where API versioning is enabled, the system shall support path-based version routing.', pattern: 'optional-feature' },
    ],
    designs: [
      { id: 'DES-AG-001', title: 'Request Router', reqIds: ['REQ-AG-001', 'REQ-AG-005'] },
      { id: 'DES-AG-002', title: 'Rate Limiter & Auth Middleware', reqIds: ['REQ-AG-002', 'REQ-AG-003'] },
      { id: 'DES-AG-003', title: 'Health Check & Fallback Manager', reqIds: ['REQ-AG-004'] },
    ],
    tasks: [
      { id: 'TSK-AG-001', title: 'Implement path-based router', phase: 'implementation', status: 'done' },
      { id: 'TSK-AG-002', title: 'Build token-bucket rate limiter', phase: 'implementation', status: 'in-progress' },
      { id: 'TSK-AG-003', title: 'Integrate JWT authentication', phase: 'integration', status: 'todo' },
      { id: 'TSK-AG-004', title: 'Design circuit breaker for fallback', phase: 'design', status: 'todo' },
      { id: 'TSK-AG-005', title: 'Write API versioning tests', phase: 'testing', status: 'todo' },
    ],
  },
];
