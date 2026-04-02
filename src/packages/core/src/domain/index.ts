/**
 * Domain Detector
 *
 * Detects project domains from file structure and dependencies.
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
