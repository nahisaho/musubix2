/**
 * Domain Detector & Classifier
 *
 * Detects project domains from file structure and dependencies.
 * DomainClassifier supports 62 business domains with keyword-based classification.
 *
 * @module domain
 * @see DES-DOM-001 — 62ドメイン対応
 */

export type DomainType =
  | 'web'
  | 'mobile'
  | 'embedded'
  | 'ai'
  | 'data'
  | 'cloud'
  | 'security'
  | 'devops'
  | 'game'
  | 'iot'
  | 'fintech'
  | 'healthtech'
  | 'edtech'
  | 'ecommerce'
  | 'social'
  | 'media'
  | 'backend'
  | 'desktop'
  | 'blockchain'
  | 'robotics'
  | 'ar-vr'
  | 'automotive'
  | 'telecom'
  | 'logistics'
  | 'agriculture'
  | 'energy'
  | 'legal'
  | 'travel'
  | 'food'
  | 'fashion'
  | 'sports'
  | 'music'
  | 'realestate';

// ---------------------------------------------------------------------------
// 62-Domain Classifier (REQ-DOM-001)
// ---------------------------------------------------------------------------

export interface DomainDefinition {
  id: string;
  name: string;
  nameJa: string;
  keywords: string[];
  components: string[];
}

export interface ClassificationResult {
  domainId: string;
  name: string;
  confidence: number;
  matchedKeywords: string[];
}

export const DOMAINS: DomainDefinition[] = [
  { id: 'healthcare', name: 'Healthcare', nameJa: 'ヘルスケア', keywords: ['patient', 'medical', 'clinical', 'diagnosis', 'ehr', 'fhir', 'hl7', 'hospital'], components: ['patient-record', 'appointment-scheduler', 'medical-chart'] },
  { id: 'finance', name: 'Finance', nameJa: '金融', keywords: ['bank', 'transaction', 'portfolio', 'investment', 'trading', 'stock', 'fund', 'asset'], components: ['ledger', 'portfolio-tracker', 'risk-engine'] },
  { id: 'education', name: 'Education', nameJa: '教育', keywords: ['student', 'course', 'curriculum', 'teacher', 'classroom', 'grade', 'lms', 'enrollment'], components: ['course-manager', 'gradebook', 'enrollment-system'] },
  { id: 'retail', name: 'Retail', nameJa: '小売', keywords: ['product', 'catalog', 'cart', 'checkout', 'store', 'merchandise', 'pos', 'sku'], components: ['product-catalog', 'shopping-cart', 'pos-terminal'] },
  { id: 'logistics', name: 'Logistics', nameJa: '物流', keywords: ['shipment', 'warehouse', 'freight', 'fleet', 'tracking', 'route', 'dispatch', 'cargo'], components: ['route-planner', 'warehouse-manager', 'fleet-tracker'] },
  { id: 'manufacturing', name: 'Manufacturing', nameJa: '製造', keywords: ['production', 'assembly', 'quality-control', 'factory', 'machine', 'batch', 'bom', 'yield'], components: ['production-line', 'quality-inspector', 'bom-manager'] },
  { id: 'real-estate', name: 'Real Estate', nameJa: '不動産', keywords: ['property', 'listing', 'mortgage', 'tenant', 'lease', 'valuation', 'mls', 'rental'], components: ['property-listing', 'lease-manager', 'valuation-engine'] },
  { id: 'legal', name: 'Legal', nameJa: '法律', keywords: ['contract', 'compliance', 'regulation', 'case-management', 'attorney', 'litigation', 'clause', 'statute'], components: ['contract-manager', 'case-tracker', 'compliance-checker'] },
  { id: 'insurance', name: 'Insurance', nameJa: '保険', keywords: ['policy', 'claim', 'premium', 'underwriting', 'actuary', 'coverage', 'deductible', 'insured'], components: ['policy-manager', 'claims-processor', 'underwriting-engine'] },
  { id: 'agriculture', name: 'Agriculture', nameJa: '農業', keywords: ['crop', 'irrigation', 'soil', 'harvest', 'livestock', 'greenhouse', 'fertilizer', 'farm'], components: ['crop-monitor', 'irrigation-controller', 'yield-tracker'] },
  { id: 'energy', name: 'Energy', nameJa: 'エネルギー', keywords: ['solar', 'wind', 'grid', 'battery', 'power', 'renewable', 'smart-meter', 'turbine'], components: ['grid-monitor', 'meter-reader', 'energy-optimizer'] },
  { id: 'telecom', name: 'Telecommunications', nameJa: '通信', keywords: ['network', 'bandwidth', 'spectrum', '5g', 'voip', 'sip', 'subscriber', 'tower'], components: ['network-monitor', 'subscriber-manager', 'billing-system'] },
  { id: 'media', name: 'Media', nameJa: 'メディア', keywords: ['content', 'publish', 'editorial', 'article', 'newsroom', 'broadcast', 'journalist', 'headline'], components: ['content-cms', 'editorial-workflow', 'publishing-engine'] },
  { id: 'gaming', name: 'Gaming', nameJa: 'ゲーム', keywords: ['game', 'player', 'level', 'score', 'multiplayer', 'leaderboard', 'quest', 'avatar'], components: ['game-engine', 'leaderboard', 'matchmaker'] },
  { id: 'travel', name: 'Travel', nameJa: '旅行', keywords: ['booking', 'reservation', 'flight', 'itinerary', 'tourism', 'hotel', 'destination', 'passport'], components: ['booking-engine', 'itinerary-planner', 'travel-search'] },
  { id: 'food-service', name: 'Food Service', nameJa: '飲食', keywords: ['restaurant', 'menu', 'recipe', 'kitchen', 'order', 'chef', 'dine', 'cuisine'], components: ['menu-manager', 'order-system', 'kitchen-display'] },
  { id: 'construction', name: 'Construction', nameJa: '建設', keywords: ['blueprint', 'contractor', 'site', 'permit', 'scaffold', 'concrete', 'excavation', 'building'], components: ['project-planner', 'permit-tracker', 'site-manager'] },
  { id: 'automotive', name: 'Automotive', nameJa: '自動車', keywords: ['vehicle', 'engine', 'autosar', 'can-bus', 'drivetrain', 'adas', 'ecu', 'obd'], components: ['vehicle-diagnostics', 'fleet-manager', 'ecu-controller'] },
  { id: 'aerospace', name: 'Aerospace', nameJa: '航空宇宙', keywords: ['aircraft', 'satellite', 'orbit', 'avionics', 'rocket', 'propulsion', 'altitude', 'airframe'], components: ['flight-controller', 'telemetry-system', 'mission-planner'] },
  { id: 'defense', name: 'Defense', nameJa: '防衛', keywords: ['military', 'tactical', 'radar', 'surveillance', 'intelligence', 'encrypted', 'missile', 'command'], components: ['command-center', 'radar-system', 'intelligence-dashboard'] },
  { id: 'government', name: 'Government', nameJa: '行政', keywords: ['citizen', 'municipality', 'permit', 'census', 'public-service', 'election', 'legislation', 'civic'], components: ['citizen-portal', 'permit-system', 'voting-platform'] },
  { id: 'nonprofit', name: 'Nonprofit', nameJa: '非営利', keywords: ['donor', 'volunteer', 'charity', 'grant', 'fundraise', 'mission', 'outreach', 'philanthropy'], components: ['donor-manager', 'volunteer-tracker', 'grant-system'] },
  { id: 'sports', name: 'Sports', nameJa: 'スポーツ', keywords: ['athlete', 'match', 'league', 'tournament', 'fitness', 'training', 'coach', 'stadium'], components: ['league-manager', 'match-tracker', 'fitness-planner'] },
  { id: 'entertainment', name: 'Entertainment', nameJa: 'エンターテインメント', keywords: ['show', 'concert', 'theater', 'performance', 'audience', 'venue', 'stage', 'act'], components: ['event-manager', 'venue-booker', 'audience-tracker'] },
  { id: 'fashion', name: 'Fashion', nameJa: 'ファッション', keywords: ['apparel', 'garment', 'textile', 'lookbook', 'wardrobe', 'sizing', 'designer', 'collection'], components: ['catalog-designer', 'size-recommender', 'collection-manager'] },
  { id: 'beauty', name: 'Beauty', nameJa: '美容', keywords: ['cosmetic', 'skincare', 'salon', 'spa', 'treatment', 'makeup', 'haircare', 'fragrance'], components: ['appointment-booker', 'product-advisor', 'salon-manager'] },
  { id: 'pets', name: 'Pets', nameJa: 'ペット', keywords: ['pet', 'veterinary', 'breed', 'adoption', 'grooming', 'kennel', 'animal', 'collar'], components: ['pet-registry', 'adoption-platform', 'grooming-scheduler'] },
  { id: 'childcare', name: 'Childcare', nameJa: '育児', keywords: ['daycare', 'nursery', 'preschool', 'toddler', 'caregiver', 'parent', 'nanny', 'childminder'], components: ['daycare-manager', 'parent-portal', 'activity-tracker'] },
  { id: 'elderly-care', name: 'Elderly Care', nameJa: '介護', keywords: ['elderly', 'nursing-home', 'caregiver', 'geriatric', 'assisted-living', 'dementia', 'senior', 'hospice'], components: ['care-planner', 'medication-tracker', 'family-portal'] },
  { id: 'pharmacy', name: 'Pharmacy', nameJa: '薬局', keywords: ['prescription', 'medication', 'pharmacist', 'dispensary', 'drug', 'dosage', 'refill', 'formulary'], components: ['prescription-manager', 'dispensary-system', 'drug-database'] },
  { id: 'dental', name: 'Dental', nameJa: '歯科', keywords: ['dentist', 'orthodontic', 'cavity', 'crown', 'implant', 'filling', 'hygienist', 'dental'], components: ['dental-chart', 'appointment-system', 'treatment-planner'] },
  { id: 'veterinary', name: 'Veterinary', nameJa: '獣医', keywords: ['vet', 'veterinarian', 'animal-health', 'vaccination', 'spay', 'neuter', 'clinic', 'livestock-health'], components: ['vet-record', 'vaccination-tracker', 'clinic-manager'] },
  { id: 'library', name: 'Library', nameJa: '図書館', keywords: ['book', 'catalog', 'borrow', 'return', 'patron', 'isbn', 'archive', 'collection'], components: ['catalog-search', 'borrow-system', 'patron-manager'] },
  { id: 'museum', name: 'Museum', nameJa: '博物館', keywords: ['exhibit', 'artifact', 'curator', 'gallery', 'collection', 'conservation', 'docent', 'archive'], components: ['exhibit-planner', 'artifact-catalog', 'visitor-guide'] },
  { id: 'hotel', name: 'Hotel', nameJa: 'ホテル', keywords: ['room', 'guest', 'check-in', 'check-out', 'housekeeping', 'concierge', 'suite', 'reservation'], components: ['room-manager', 'guest-portal', 'housekeeping-tracker'] },
  { id: 'restaurant', name: 'Restaurant', nameJa: 'レストラン', keywords: ['table', 'waiter', 'menu', 'reservation', 'kitchen', 'order', 'bill', 'seating'], components: ['table-manager', 'order-system', 'reservation-booker'] },
  { id: 'parking', name: 'Parking', nameJa: '駐車場', keywords: ['parking', 'lot', 'garage', 'meter', 'valet', 'space', 'vehicle-entry', 'barrier'], components: ['space-finder', 'meter-manager', 'entry-controller'] },
  { id: 'gym', name: 'Gym', nameJa: 'ジム', keywords: ['gym', 'membership', 'workout', 'trainer', 'equipment', 'exercise', 'class', 'session'], components: ['membership-manager', 'class-scheduler', 'trainer-portal'] },
  { id: 'clinic', name: 'Clinic', nameJa: 'クリニック', keywords: ['clinic', 'appointment', 'doctor', 'consultation', 'diagnosis', 'outpatient', 'referral', 'triage'], components: ['appointment-system', 'patient-intake', 'referral-manager'] },
  { id: 'delivery', name: 'Delivery', nameJa: '配送', keywords: ['delivery', 'courier', 'parcel', 'dispatch', 'last-mile', 'pickup', 'drop-off', 'package'], components: ['dispatch-engine', 'tracking-system', 'route-optimizer'] },
  { id: 'inventory', name: 'Inventory', nameJa: '在庫管理', keywords: ['inventory', 'stock', 'warehouse', 'reorder', 'barcode', 'sku', 'shelf', 'count'], components: ['stock-tracker', 'reorder-engine', 'barcode-scanner'] },
  { id: 'project-management', name: 'Project Management', nameJa: 'プロジェクト管理', keywords: ['project', 'task', 'sprint', 'milestone', 'gantt', 'kanban', 'backlog', 'deadline'], components: ['task-board', 'gantt-chart', 'sprint-planner'] },
  { id: 'e-learning', name: 'E-Learning', nameJa: 'eラーニング', keywords: ['e-learning', 'online-course', 'quiz', 'lecture', 'certificate', 'scorm', 'module', 'assessment'], components: ['course-player', 'quiz-engine', 'certificate-issuer'] },
  { id: 'employee-management', name: 'Employee Management', nameJa: '従業員管理', keywords: ['employee', 'payroll', 'attendance', 'leave', 'onboarding', 'performance-review', 'timesheet', 'hr'], components: ['payroll-processor', 'attendance-tracker', 'onboarding-flow'] },
  { id: 'household-finance', name: 'Household Finance', nameJa: '家計管理', keywords: ['budget', 'expense', 'saving', 'household', 'receipt', 'income', 'allowance', 'spending'], components: ['budget-planner', 'expense-tracker', 'savings-goal'] },
  { id: 'ticketing', name: 'Ticketing', nameJa: 'チケット', keywords: ['ticket', 'seat', 'venue', 'admission', 'barcode', 'event', 'box-office', 'gate'], components: ['ticket-issuer', 'seat-selector', 'gate-scanner'] },
  { id: 'iot', name: 'IoT', nameJa: 'IoT', keywords: ['sensor', 'device', 'mqtt', 'gateway', 'edge', 'telemetry', 'actuator', 'firmware'], components: ['device-manager', 'telemetry-collector', 'edge-gateway'] },
  { id: 'api-gateway', name: 'API Gateway', nameJa: 'APIゲートウェイ', keywords: ['api', 'gateway', 'rate-limit', 'throttle', 'proxy', 'endpoint', 'middleware', 'openapi'], components: ['rate-limiter', 'proxy-router', 'auth-middleware'] },
  { id: 'social-media', name: 'Social Media', nameJa: 'ソーシャルメディア', keywords: ['post', 'feed', 'follow', 'like', 'share', 'comment', 'timeline', 'hashtag'], components: ['feed-engine', 'follower-graph', 'notification-service'] },
  { id: 'messaging', name: 'Messaging', nameJa: 'メッセージング', keywords: ['message', 'chat', 'inbox', 'thread', 'conversation', 'dm', 'push', 'websocket'], components: ['chat-server', 'inbox-manager', 'push-notifier'] },
  { id: 'calendar', name: 'Calendar', nameJa: 'カレンダー', keywords: ['calendar', 'event', 'schedule', 'reminder', 'recurring', 'invite', 'availability', 'ical'], components: ['event-scheduler', 'reminder-engine', 'availability-checker'] },
  { id: 'weather', name: 'Weather', nameJa: '天気', keywords: ['weather', 'forecast', 'temperature', 'humidity', 'precipitation', 'wind', 'barometer', 'climate'], components: ['forecast-engine', 'weather-display', 'alert-system'] },
  { id: 'maps', name: 'Maps', nameJa: '地図', keywords: ['map', 'geocode', 'latitude', 'longitude', 'navigation', 'poi', 'directions', 'geofence'], components: ['map-renderer', 'geocoder', 'navigation-engine'] },
  { id: 'payments', name: 'Payments', nameJa: '決済', keywords: ['payment', 'stripe', 'checkout', 'invoice', 'refund', 'receipt', 'billing', 'charge'], components: ['payment-processor', 'invoice-generator', 'refund-handler'] },
  { id: 'subscription', name: 'Subscription', nameJa: 'サブスクリプション', keywords: ['subscription', 'plan', 'trial', 'recurring', 'cancel', 'upgrade', 'tier', 'renewal'], components: ['plan-manager', 'billing-cycle', 'trial-handler'] },
  { id: 'analytics', name: 'Analytics', nameJa: '分析', keywords: ['analytics', 'dashboard', 'metric', 'funnel', 'cohort', 'report', 'kpi', 'visualization'], components: ['dashboard-builder', 'metric-collector', 'report-generator'] },
  { id: 'crm', name: 'CRM', nameJa: 'CRM', keywords: ['crm', 'lead', 'contact', 'opportunity', 'pipeline', 'deal', 'prospect', 'account'], components: ['lead-tracker', 'pipeline-manager', 'contact-database'] },
  { id: 'erp', name: 'ERP', nameJa: 'ERP', keywords: ['erp', 'procurement', 'asset', 'general-ledger', 'accounts-payable', 'receivable', 'fiscal', 'compliance'], components: ['procurement-module', 'ledger-system', 'asset-tracker'] },
  { id: 'hr', name: 'HR', nameJa: '人事', keywords: ['recruitment', 'applicant', 'interview', 'hiring', 'benefits', 'compensation', 'talent', 'diversity'], components: ['applicant-tracker', 'interview-scheduler', 'benefits-manager'] },
  { id: 'supply-chain', name: 'Supply Chain', nameJa: 'サプライチェーン', keywords: ['supply-chain', 'procurement', 'supplier', 'vendor', 'logistics', 'distribution', 'fulfillment', 'demand'], components: ['supplier-portal', 'demand-planner', 'fulfillment-engine'] },
  { id: 'marketplace', name: 'Marketplace', nameJa: 'マーケットプレイス', keywords: ['marketplace', 'seller', 'buyer', 'listing', 'commission', 'storefront', 'review', 'rating'], components: ['listing-manager', 'seller-dashboard', 'review-system'] },
  { id: 'auction', name: 'Auction', nameJa: 'オークション', keywords: ['auction', 'bid', 'lot', 'reserve', 'hammer', 'consignment', 'paddle', 'increment'], components: ['bid-engine', 'lot-catalog', 'auction-timer'] },
];

export class DomainClassifier {
  classify(text: string): ClassificationResult[] {
    const lower = text.toLowerCase();
    const results: ClassificationResult[] = [];

    for (const domain of DOMAINS) {
      const matched = domain.keywords.filter((kw) => lower.includes(kw));
      if (matched.length > 0) {
        const confidence = Math.min(matched.length / domain.keywords.length, 1.0);
        results.push({
          domainId: domain.id,
          name: domain.name,
          confidence: Math.round(confidence * 100) / 100,
          matchedKeywords: matched,
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  getDomain(id: string): DomainDefinition | undefined {
    return DOMAINS.find((d) => d.id === id);
  }

  getAllDomains(): DomainDefinition[] {
    return [...DOMAINS];
  }
}

export function createDomainClassifier(): DomainClassifier {
  return new DomainClassifier();
}

export interface DomainDetectionResult {
  domain: DomainType;
  confidence: number;
  evidence: string[];
}

const DOMAIN_KEYWORDS: Record<DomainType, string[]> = {
  web: [
    'react',
    'vue',
    'angular',
    'next',
    'nuxt',
    'svelte',
    'html',
    'css',
    'webpack',
    'vite',
    'tailwind',
  ],
  mobile: ['react-native', 'expo', 'flutter', 'ionic', 'capacitor', 'cordova', 'swift', 'kotlin'],
  embedded: ['arduino', 'raspberry', 'stm32', 'esp32', 'firmware', 'rtos', 'hal'],
  ai: [
    'tensorflow',
    'pytorch',
    'keras',
    'scikit-learn',
    'transformers',
    'openai',
    'langchain',
    'huggingface',
  ],
  data: ['pandas', 'numpy', 'spark', 'hadoop', 'airflow', 'dbt', 'kafka', 'bigquery'],
  cloud: ['aws-sdk', 'azure', 'gcloud', 'serverless', 'lambda', 'cloudformation', 'terraform'],
  security: ['helmet', 'cors', 'bcrypt', 'jsonwebtoken', 'passport', 'oauth', 'crypto'],
  devops: ['docker', 'kubernetes', 'ansible', 'jenkins', 'github-actions', 'prometheus', 'grafana'],
  game: ['unity', 'unreal', 'godot', 'phaser', 'pixi', 'three', 'babylonjs', 'cannon'],
  iot: ['mqtt', 'coap', 'zigbee', 'bluetooth', 'lorawan', 'sensor', 'edge'],
  fintech: ['stripe', 'plaid', 'payment', 'banking', 'trading', 'ledger', 'accounting'],
  healthtech: ['hl7', 'fhir', 'dicom', 'medical', 'patient', 'clinical', 'ehr'],
  edtech: ['lms', 'course', 'quiz', 'scorm', 'learning', 'student', 'classroom'],
  ecommerce: ['shopify', 'woocommerce', 'cart', 'checkout', 'product', 'inventory', 'catalog'],
  social: ['feed', 'timeline', 'follow', 'notification', 'chat', 'messaging', 'profile'],
  media: ['ffmpeg', 'video', 'audio', 'streaming', 'transcoding', 'player', 'codec'],
  backend: ['express', 'fastify', 'nestjs', 'koa', 'hapi', 'graphql', 'trpc', 'prisma'],
  desktop: ['electron', 'tauri', 'qt', 'gtk', 'wxwidgets', 'winforms', 'wpf'],
  blockchain: [
    'ethers',
    'web3',
    'solidity',
    'hardhat',
    'truffle',
    'solana',
    'nft',
    'smart-contract',
  ],
  robotics: ['ros', 'gazebo', 'moveit', 'lidar', 'slam', 'navigation', 'actuator'],
  'ar-vr': ['arkit', 'arcore', 'oculus', 'webxr', 'aframe', 'vuforia', 'spatial'],
  automotive: ['autosar', 'can', 'obd', 'vehicle', 'carplay', 'adas', 'v2x'],
  telecom: ['sip', 'voip', 'twilio', 'asterisk', '5g', 'lte', 'spectrum'],
  logistics: ['route', 'fleet', 'warehouse', 'shipping', 'tracking', 'supply-chain', 'delivery'],
  agriculture: [
    'crop',
    'irrigation',
    'soil',
    'precision-agriculture',
    'drone',
    'harvest',
    'greenhouse',
  ],
  energy: ['solar', 'wind', 'battery', 'grid', 'smart-meter', 'renewable', 'power'],
  legal: ['contract', 'compliance', 'regulation', 'case-management', 'legal-tech', 'clause'],
  travel: ['booking', 'reservation', 'hotel', 'flight', 'itinerary', 'tourism', 'hospitality'],
  food: ['recipe', 'restaurant', 'menu', 'order', 'kitchen', 'nutrition', 'delivery'],
  fashion: ['apparel', 'sizing', 'lookbook', 'garment', 'textile', 'pattern', 'wardrobe'],
  sports: ['fitness', 'workout', 'match', 'league', 'score', 'athlete', 'training'],
  music: ['audio', 'midi', 'synthesizer', 'playlist', 'track', 'instrument', 'daw'],
  realestate: ['property', 'listing', 'mortgage', 'tenant', 'lease', 'valuation', 'mls'],
};

const FILE_EXTENSION_SIGNALS: Record<string, DomainType[]> = {
  '.tsx': ['web'],
  '.jsx': ['web'],
  '.vue': ['web'],
  '.svelte': ['web'],
  '.html': ['web'],
  '.css': ['web'],
  '.scss': ['web'],
  '.swift': ['mobile'],
  '.kt': ['mobile'],
  '.dart': ['mobile'],
  '.py': ['ai', 'data', 'backend'],
  '.ipynb': ['ai', 'data'],
  '.ino': ['embedded', 'iot'],
  '.sol': ['blockchain'],
  '.proto': ['backend', 'cloud'],
  '.tf': ['devops', 'cloud'],
  '.yml': ['devops'],
  '.yaml': ['devops'],
  '.cs': ['game', 'desktop', 'backend'],
  '.shader': ['game', 'ar-vr'],
  '.glsl': ['game', 'ar-vr'],
  '.wasm': ['web', 'embedded'],
};

const FILENAME_SIGNALS: Record<string, DomainType[]> = {
  Dockerfile: ['devops', 'cloud'],
  'docker-compose': ['devops', 'cloud'],
  Jenkinsfile: ['devops'],
  Makefile: ['embedded', 'devops'],
  'CMakeLists.txt': ['embedded', 'desktop'],
  'serverless.yml': ['cloud'],
  terraform: ['devops', 'cloud'],
  '.github': ['devops'],
};

export class DomainDetector {
  detect(projectFiles: string[], packageJson?: Record<string, unknown>): DomainDetectionResult[] {
    const scores = new Map<DomainType, { confidence: number; evidence: string[] }>();

    const addScore = (domain: DomainType, score: number, evidence: string): void => {
      const existing = scores.get(domain) ?? { confidence: 0, evidence: [] };
      existing.confidence += score;
      existing.evidence.push(evidence);
      scores.set(domain, existing);
    };

    for (const file of projectFiles) {
      const ext = this.getExtension(file);
      if (ext && FILE_EXTENSION_SIGNALS[ext]) {
        for (const domain of FILE_EXTENSION_SIGNALS[ext]) {
          addScore(domain, 0.3, `file extension: ${ext} (${file})`);
        }
      }

      for (const [pattern, domains] of Object.entries(FILENAME_SIGNALS)) {
        if (file.includes(pattern)) {
          for (const domain of domains) {
            addScore(domain, 0.4, `filename pattern: ${pattern} (${file})`);
          }
        }
      }
    }

    if (packageJson) {
      const allDeps = this.extractDependencies(packageJson);
      for (const dep of allDeps) {
        const depLower = dep.toLowerCase();
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [
          DomainType,
          string[],
        ][]) {
          for (const keyword of keywords) {
            if (depLower.includes(keyword)) {
              addScore(domain, 0.5, `dependency: ${dep} matches keyword "${keyword}"`);
            }
          }
        }
      }
    }

    const results: DomainDetectionResult[] = [];
    for (const [domain, data] of scores.entries()) {
      const capped = Math.min(data.confidence, 1.0);
      results.push({
        domain,
        confidence: Math.round(capped * 100) / 100,
        evidence: data.evidence,
      });
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  getSupportedDomains(): DomainType[] {
    return Object.keys(DOMAIN_KEYWORDS) as DomainType[];
  }

  getDomainKeywords(domain: DomainType): string[] {
    return DOMAIN_KEYWORDS[domain] ?? [];
  }

  private getExtension(filePath: string): string | undefined {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) {
      return undefined;
    }
    return filePath.slice(lastDot);
  }

  private extractDependencies(packageJson: Record<string, unknown>): string[] {
    const deps: string[] = [];
    const sections = ['dependencies', 'devDependencies', 'peerDependencies'];
    for (const section of sections) {
      const sectionData = packageJson[section];
      if (sectionData && typeof sectionData === 'object') {
        deps.push(...Object.keys(sectionData as Record<string, unknown>));
      }
    }
    return deps;
  }
}

export function createDomainDetector(): DomainDetector {
  return new DomainDetector();
}
