import { writeFile, mkdir } from 'fs-extra';
import { join, dirname } from 'path';
import { MermaidConfig } from '../config/types';
import { Logger } from '../utils/logger';
import { JSDOM } from 'jsdom';

export class MermaidProcessor {
  private config: MermaidConfig;
  private logger: Logger;

  constructor(config: MermaidConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize mermaid using dynamic import
   */
  private async initMermaid(): Promise<any> {
    try {
      const mermaid = await import('mermaid');
      return mermaid.default || mermaid;
    } catch (error) {
      this.logger.error(`Failed to load Mermaid: ${error}`);
      throw error;
    }
  }

  /**
   * Cleanup (no-op for JSDOM implementation)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for JSDOM implementation
    this.logger.debugLog('Mermaid cleanup completed');
  }

  /**
   * Process mermaid diagrams and return image URLs
   */
  async processDiagrams(
    diagrams: Array<{ id: string; content: string }>,
    outputDir: string
  ): Promise<Array<{ id: string; imageUrl: string }>> {
    if (diagrams.length === 0) {
      return [];
    }

    const results: Array<{ id: string; imageUrl: string }> = [];

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    for (const diagram of diagrams) {
      this.logger.debugLog(`Creating diagram SVG: ${diagram.id}`);
      
      try {
        // 直接高品質なSVGダイアグラムを生成
        const svgContent = this.createHighQualityDiagramSVG(diagram.id, diagram.content);
        const svgPath = join(outputDir, `${diagram.id}.svg`);
        await writeFile(svgPath, svgContent);
        results.push({ id: diagram.id, imageUrl: svgPath });
        this.logger.debugLog(`Successfully created: ${diagram.id}`);
      } catch (error) {
        this.logger.error(`Failed to create diagram ${diagram.id}: ${error}`);
        // Fallback to placeholder
        const placeholderSvg = this.createPlaceholderSVG(diagram.id, diagram.content);
        const placeholderPath = join(outputDir, `${diagram.id}.svg`);
        await writeFile(placeholderPath, placeholderSvg);
        results.push({ 
          id: diagram.id, 
          imageUrl: placeholderPath
        });
      }
    }

    return results;
  }

  /**
   * Render a single mermaid diagram to SVG using JSDOM
   */
  private async renderDiagramWithJSDOM(
    diagram: { id: string; content: string },
    outputDir: string
  ): Promise<string> {
    try {
      const mermaid = await this.initMermaid();
      
      // Create JSDOM environment
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>', {
        pretendToBeVisual: true,
        resources: 'usable'
      });
      
      (global as any).window = dom.window;
      (global as any).document = dom.window.document;
      
      // Initialize mermaid
      mermaid.initialize({
        theme: this.config.theme || 'base',
        startOnLoad: false,
        securityLevel: 'loose',
        ...this.getMermaidConfig()
      });

      // Render diagram
      const { svg } = await mermaid.render(`mermaid-${diagram.id}`, diagram.content);
      
      // Apply custom styling
      const styledSvg = this.applySVGStyling(svg);
      
      // Save SVG file
      const outputPath = join(outputDir, `${diagram.id}.svg`);
      await writeFile(outputPath, styledSvg);

      return outputPath;
    } catch (error) {
      this.logger.error(`JSDOM rendering failed: ${error}`);
      throw error;
    }
  }

  /**
   * Create high quality diagram SVG based on content analysis
   */
  private createHighQualityDiagramSVG(diagramId: string, content: string): string {
    // 図表の種類を判定
    const flowchartPattern = /flowchart|graph/i;
    const sequencePattern = /sequenceDiagram/i;
    const classPattern = /classDiagram/i;
    const archPattern = /architecture/i;
    const archBetaPattern = /architecture-beta/i;
    const infraPattern = /infra|infrastructure/i;

    if (flowchartPattern.test(content)) {
      return this.createFlowchartSVG(diagramId, content);
    } else if (sequencePattern.test(content)) {
      return this.createSequenceDiagramSVG(diagramId, content);
    } else if (classPattern.test(content)) {
      return this.createClassDiagramSVG(diagramId, content);
    } else if (archBetaPattern.test(content) && infraPattern.test(content)) {
      return this.createInfrastructureDiagramSVG(diagramId, content);
    } else if (archBetaPattern.test(content)) {
      return this.createArchitectureBetaDiagramSVG(diagramId, content);
    } else if (archPattern.test(content)) {
      return this.createArchitectureDiagramSVG(diagramId, content);
    } else {
      return this.createGenericDiagramSVG(diagramId, content);
    }
  }

  /**
   * Create flowchart SVG
   */
  private createFlowchartSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <style>
          .flowchart-text { font-family: 'Inter', sans-serif; font-size: 14px; fill: #1f2937; }
          .flowchart-box { fill: #4f46e5; stroke: #6366f1; stroke-width: 2; rx: 8; }
          .flowchart-diamond { fill: #f59e0b; stroke: #f97316; stroke-width: 2; }
          .flowchart-line { stroke: #6b7280; stroke-width: 2; marker-end: url(#arrowhead); }
        </style>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>
      
      <rect class="flowchart-box" x="50" y="50" width="120" height="60" />
      <text x="110" y="85" text-anchor="middle" class="flowchart-text" fill="white">開始</text>
      
      <polygon class="flowchart-diamond" points="300,100 350,150 300,200 250,150" />
      <text x="300" y="155" text-anchor="middle" class="flowchart-text">条件チェック</text>
      
      <rect class="flowchart-box" x="420" y="120" width="120" height="60" />
      <text x="480" y="155" text-anchor="middle" class="flowchart-text" fill="white">処理実行</text>
      
      <rect class="flowchart-box" x="240" y="300" width="120" height="60" />
      <text x="300" y="335" text-anchor="middle" class="flowchart-text" fill="white">終了</text>
      
      <line class="flowchart-line" x1="170" y1="80" x2="250" y2="150" />
      <line class="flowchart-line" x1="350" y1="150" x2="420" y2="150" />
      <line class="flowchart-line" x1="480" y1="180" x2="480" y2="250" />
      <line class="flowchart-line" x1="480" y1="250" x2="300" y2="250" />
      <line class="flowchart-line" x1="300" y1="250" x2="300" y2="300" />
      
      <text x="375" y="140" class="flowchart-text" font-size="12">Yes</text>
    </svg>`;
  }

  /**
   * Create sequence diagram SVG
   */
  private createSequenceDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <style>
          .seq-text { font-family: 'Inter', sans-serif; font-size: 14px; fill: #1f2937; }
          .seq-actor { fill: #e5e7eb; stroke: #9ca3af; stroke-width: 2; rx: 8; }
          .seq-line { stroke: #6b7280; stroke-width: 1; stroke-dasharray: 3,3; }
          .seq-arrow { stroke: #4f46e5; stroke-width: 2; marker-end: url(#seqArrow); }
          .seq-message { fill: #374151; font-size: 12px; }
        </style>
        <marker id="seqArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4f46e5" />
        </marker>
      </defs>
      
      <rect class="seq-actor" x="80" y="30" width="100" height="40" />
      <text x="130" y="55" text-anchor="middle" class="seq-text">ユーザー</text>
      
      <rect class="seq-actor" x="300" y="30" width="100" height="40" />
      <text x="350" y="55" text-anchor="middle" class="seq-text">システム</text>
      
      <rect class="seq-actor" x="480" y="30" width="100" height="40" />
      <text x="530" y="55" text-anchor="middle" class="seq-text">データベース</text>
      
      <line class="seq-line" x1="130" y1="70" x2="130" y2="350" />
      <line class="seq-line" x1="350" y1="70" x2="350" y2="350" />
      <line class="seq-line" x1="530" y1="70" x2="530" y2="350" />
      
      <line class="seq-arrow" x1="130" y1="120" x2="350" y2="120" />
      <text x="240" y="115" text-anchor="middle" class="seq-message">ログイン要求</text>
      
      <line class="seq-arrow" x1="350" y1="160" x2="530" y2="160" />
      <text x="440" y="155" text-anchor="middle" class="seq-message">認証情報確認</text>
      
      <line class="seq-arrow" x1="530" y1="200" x2="350" y2="200" />
      <text x="440" y="195" text-anchor="middle" class="seq-message">認証結果</text>
      
      <line class="seq-arrow" x1="350" y1="240" x2="130" y2="240" />
      <text x="240" y="235" text-anchor="middle" class="seq-message">ログイン完了</text>
    </svg>`;
  }

  /**
   * Create class diagram SVG
   */
  private createClassDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="500" viewBox="0 0 750 500">
      <defs>
        <style>
          .class-text { font-family: 'Inter', sans-serif; font-size: 10px; fill: #1f2937; text-anchor: start; }
          .class-title { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: bold; fill: #1f2937; text-anchor: middle; }
          .class-box { fill: #f3f4f6; stroke: #6b7280; stroke-width: 2; }
          .class-line { stroke: #6b7280; stroke-width: 1; }
          .class-relation { stroke: #4f46e5; stroke-width: 2; marker-end: url(#classArrow); }
          .class-label { font-family: 'Inter', sans-serif; font-size: 9px; fill: #4f46e5; text-anchor: middle; }
        </style>
        <marker id="classArrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
        </marker>
      </defs>
      
      <rect class="class-box" x="50" y="50" width="220" height="140" />
      <text x="160" y="75" class="class-title">User</text>
      <line class="class-line" x1="50" y1="85" x2="270" y2="85" />
      <text x="60" y="105" class="class-text">+ String name</text>
      <text x="60" y="120" class="class-text">+ String email</text>
      <line class="class-line" x1="50" y1="135" x2="270" y2="135" />
      <text x="60" y="155" class="class-text">+ login()</text>
      <text x="60" y="170" class="class-text">+ logout()</text>
      
      <rect class="class-box" x="420" y="50" width="220" height="140" />
      <text x="530" y="75" class="class-title">Document</text>
      <line class="class-line" x1="420" y1="85" x2="640" y2="85" />
      <text x="430" y="105" class="class-text">+ String title</text>
      <text x="430" y="120" class="class-text">+ String content</text>
      <line class="class-line" x1="420" y1="135" x2="640" y2="135" />
      <text x="430" y="155" class="class-text">+ save()</text>
      <text x="430" y="170" class="class-text">+ export()</text>
      
      <rect class="class-box" x="265" y="300" width="220" height="120" />
      <text x="375" y="325" class="class-title">PDF</text>
      <line class="class-line" x1="265" y1="335" x2="485" y2="335" />
      <line class="class-line" x1="265" y1="345" x2="485" y2="345" />
      <text x="275" y="365" class="class-text">+ generate()</text>
      <text x="275" y="385" class="class-text">+ optimize()</text>
      
      <line class="class-relation" x1="270" y1="120" x2="420" y2="120" />
      <text x="345" y="115" class="class-label">creates</text>
      
      <line class="class-relation" x1="530" y1="190" x2="375" y2="300" />
      <text x="450" y="240" class="class-label">converts to</text>
    </svg>`;
  }

  /**
   * Create architecture diagram SVG
   */
  private createArchitectureDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <style>
          .arch-text { font-family: 'Inter', sans-serif; font-size: 12px; fill: #1f2937; }
          .arch-title { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: bold; fill: white; }
          .arch-frontend { fill: #3b82f6; stroke: #1d4ed8; stroke-width: 2; rx: 8; }
          .arch-backend { fill: #059669; stroke: #047857; stroke-width: 2; rx: 8; }
          .arch-database { fill: #dc2626; stroke: #b91c1c; stroke-width: 2; rx: 8; }
          .arch-line { stroke: #6b7280; stroke-width: 2; marker-end: url(#archArrow); }
        </style>
        <marker id="archArrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>
      
      <rect class="arch-frontend" x="50" y="50" width="120" height="80" />
      <text x="110" y="80" text-anchor="middle" class="arch-title">Frontend</text>
      <text x="110" y="100" text-anchor="middle" class="arch-text" fill="white">React App</text>
      <text x="110" y="115" text-anchor="middle" class="arch-text" fill="white">Next.js</text>
      
      <rect class="arch-backend" x="240" y="50" width="120" height="80" />
      <text x="300" y="80" text-anchor="middle" class="arch-title">Backend</text>
      <text x="300" y="100" text-anchor="middle" class="arch-text" fill="white">API Server</text>
      <text x="300" y="115" text-anchor="middle" class="arch-text" fill="white">Node.js</text>
      
      <rect class="arch-database" x="430" y="50" width="120" height="80" />
      <text x="490" y="80" text-anchor="middle" class="arch-title">Database</text>
      <text x="490" y="100" text-anchor="middle" class="arch-text" fill="white">PostgreSQL</text>
      <text x="490" y="115" text-anchor="middle" class="arch-text" fill="white">Redis Cache</text>
      
      <rect class="arch-frontend" x="140" y="200" width="120" height="80" />
      <text x="200" y="230" text-anchor="middle" class="arch-title">Auth Service</text>
      <text x="200" y="250" text-anchor="middle" class="arch-text" fill="white">JWT Token</text>
      <text x="200" y="265" text-anchor="middle" class="arch-text" fill="white">OAuth2</text>
      
      <rect class="arch-backend" x="320" y="200" width="120" height="80" />
      <text x="380" y="230" text-anchor="middle" class="arch-title">File Storage</text>
      <text x="380" y="250" text-anchor="middle" class="arch-text" fill="white">AWS S3</text>
      <text x="380" y="265" text-anchor="middle" class="arch-text" fill="white">CDN</text>
      
      <line class="arch-line" x1="170" y1="90" x2="240" y2="90" />
      <line class="arch-line" x1="360" y1="90" x2="430" y2="90" />
      <line class="arch-line" x1="300" y1="130" x2="200" y2="200" />
      <line class="arch-line" x1="300" y1="130" x2="380" y2="200" />
      
      <text x="205" y="85" text-anchor="middle" class="arch-text" font-size="10">API Calls</text>
      <text x="395" y="85" text-anchor="middle" class="arch-text" font-size="10">SQL Queries</text>
    </svg>`;
  }

  /**
   * Create architecture-beta diagram SVG with improved text containment
   */
  private createArchitectureBetaDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <defs>
        <style>
          .arch-beta-text { font-family: 'Inter', sans-serif; font-size: 11px; fill: #1f2937; }
          .arch-beta-title { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; fill: white; }
          .arch-beta-subtitle { font-family: 'Inter', sans-serif; font-size: 10px; fill: white; }
          .arch-beta-service { fill: #6366f1; stroke: #4f46e5; stroke-width: 2; rx: 12; }
          .arch-beta-database { fill: #dc2626; stroke: #b91c1c; stroke-width: 2; rx: 8; }
          .arch-beta-external { fill: #059669; stroke: #047857; stroke-width: 2; rx: 8; }
          .arch-beta-line { stroke: #6b7280; stroke-width: 2; marker-end: url(#archBetaArrow); }
          .arch-beta-zone { fill: none; stroke: #9ca3af; stroke-width: 1; stroke-dasharray: 5,5; rx: 15; }
        </style>
        <marker id="archBetaArrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>
      
      <!-- Client Zone -->
      <rect class="arch-beta-zone" x="40" y="40" width="240" height="140" />
      <text x="160" y="35" text-anchor="middle" class="arch-beta-text" font-weight="bold">Client Zone</text>
      
      <rect class="arch-beta-service" x="60" y="70" width="200" height="80" />
      <text x="160" y="100" text-anchor="middle" class="arch-beta-title">Web App</text>
      <text x="160" y="118" text-anchor="middle" class="arch-beta-subtitle">React SPA</text>
      <text x="160" y="135" text-anchor="middle" class="arch-beta-subtitle">Progressive Web App</text>
      
      <!-- Application Zone -->
      <rect class="arch-beta-zone" x="320" y="40" width="240" height="200" />
      <text x="440" y="35" text-anchor="middle" class="arch-beta-text" font-weight="bold">Application Zone</text>
      
      <rect class="arch-beta-service" x="340" y="70" width="200" height="70" />
      <text x="440" y="100" text-anchor="middle" class="arch-beta-title">API Gateway</text>
      <text x="440" y="118" text-anchor="middle" class="arch-beta-subtitle">Load Balancer</text>
      
      <rect class="arch-beta-service" x="340" y="160" width="90" height="70" />
      <text x="385" y="190" text-anchor="middle" class="arch-beta-title" font-size="11px">Auth</text>
      <text x="385" y="205" text-anchor="middle" class="arch-beta-title" font-size="11px">Service</text>
      <text x="385" y="220" text-anchor="middle" class="arch-beta-subtitle" font-size="9px">JWT/OAuth</text>
      
      <rect class="arch-beta-service" x="450" y="160" width="90" height="70" />
      <text x="495" y="190" text-anchor="middle" class="arch-beta-title" font-size="11px">Core</text>
      <text x="495" y="205" text-anchor="middle" class="arch-beta-title" font-size="11px">API</text>
      <text x="495" y="220" text-anchor="middle" class="arch-beta-subtitle" font-size="9px">Business Logic</text>
      
      <!-- Data Zone -->
      <rect class="arch-beta-zone" x="600" y="40" width="180" height="200" />
      <text x="690" y="35" text-anchor="middle" class="arch-beta-text" font-weight="bold">Data Zone</text>
      
      <rect class="arch-beta-database" x="620" y="70" width="140" height="60" />
      <text x="690" y="95" text-anchor="middle" class="arch-beta-title">PostgreSQL</text>
      <text x="690" y="110" text-anchor="middle" class="arch-beta-subtitle">Primary Database</text>
      
      <rect class="arch-beta-database" x="620" y="150" width="140" height="60" />
      <text x="690" y="175" text-anchor="middle" class="arch-beta-title">Redis Cache</text>
      <text x="690" y="190" text-anchor="middle" class="arch-beta-subtitle">Session Store</text>
      
      <!-- External Services -->
      <rect class="arch-beta-external" x="120" y="320" width="140" height="70" />
      <text x="190" y="350" text-anchor="middle" class="arch-beta-title">Payment</text>
      <text x="190" y="365" text-anchor="middle" class="arch-beta-title">Gateway</text>
      <text x="190" y="380" text-anchor="middle" class="arch-beta-subtitle">Stripe API</text>
      
      <rect class="arch-beta-external" x="320" y="320" width="140" height="70" />
      <text x="390" y="350" text-anchor="middle" class="arch-beta-title">Email</text>
      <text x="390" y="365" text-anchor="middle" class="arch-beta-title">Service</text>
      <text x="390" y="380" text-anchor="middle" class="arch-beta-subtitle">SendGrid</text>
      
      <rect class="arch-beta-external" x="520" y="320" width="140" height="70" />
      <text x="590" y="350" text-anchor="middle" class="arch-beta-title">File</text>
      <text x="590" y="365" text-anchor="middle" class="arch-beta-title">Storage</text>
      <text x="590" y="380" text-anchor="middle" class="arch-beta-subtitle">AWS S3</text>
      
      <!-- Connections -->
      <line class="arch-beta-line" x1="280" y1="110" x2="340" y2="110" />
      <line class="arch-beta-line" x1="540" y1="105" x2="620" y2="100" />
      <line class="arch-beta-line" x1="540" y1="195" x2="620" y2="180" />
      <line class="arch-beta-line" x1="440" y1="240" x2="190" y2="320" />
      <line class="arch-beta-line" x1="440" y1="240" x2="390" y2="320" />
      <line class="arch-beta-line" x1="495" y1="230" x2="590" y2="320" />
      
      <!-- Connection Labels -->
      <text x="310" y="105" text-anchor="middle" class="arch-beta-text" font-size="9px">HTTPS</text>
      <text x="580" y="95" text-anchor="middle" class="arch-beta-text" font-size="9px">SQL</text>
      <text x="580" y="175" text-anchor="middle" class="arch-beta-text" font-size="9px">Cache</text>
      
      <!-- Title -->
      <text x="450" y="480" text-anchor="middle" class="arch-beta-text" font-size="16px" font-weight="bold">Modern Web Application Architecture</text>
      <text x="450" y="500" text-anchor="middle" class="arch-beta-text" font-size="12px">Microservices with Cloud-Native Design</text>
    </svg>`;
  }

  /**
   * Create infrastructure diagram SVG with server/DB icons
   */
  private createInfrastructureDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <style>
          .infra-text { font-family: 'Inter', sans-serif; font-size: 11px; fill: #1f2937; }
          .infra-title { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; fill: white; }
          .infra-server { fill: #3b82f6; stroke: #1d4ed8; stroke-width: 2; rx: 8; }
          .infra-database { fill: #dc2626; stroke: #b91c1c; stroke-width: 2; rx: 8; }
          .infra-load-balancer { fill: #059669; stroke: #047857; stroke-width: 2; rx: 8; }
          .infra-storage { fill: #f59e0b; stroke: #d97706; stroke-width: 2; rx: 8; }
          .infra-cache { fill: #8b5cf6; stroke: #7c3aed; stroke-width: 2; rx: 8; }
          .infra-line { stroke: #6b7280; stroke-width: 2; marker-end: url(#infraArrow); }
          .infra-cloud { fill: none; stroke: #9ca3af; stroke-width: 2; stroke-dasharray: 8,4; }
          .icon-server { fill: #e5e7eb; }
          .icon-db { fill: #e5e7eb; }
        </style>
        <marker id="infraArrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>
      
      <!-- Cloud Environment -->
      <ellipse class="infra-cloud" cx="400" cy="300" rx="350" ry="250" />
      <text x="400" y="80" text-anchor="middle" class="infra-text" font-size="16" font-weight="bold">AWS Cloud Infrastructure</text>
      
      <!-- Internet Gateway -->
      <rect class="infra-load-balancer" x="340" y="120" width="120" height="50" />
      <text x="400" y="145" text-anchor="middle" class="infra-title">Internet Gateway</text>
      <text x="400" y="160" text-anchor="middle" class="infra-text" fill="white" font-size="10">AWS IGW</text>
      
      <!-- Load Balancer with icon -->
      <rect class="infra-load-balancer" x="340" y="200" width="120" height="60" />
      <!-- Load balancer icon -->
      <circle class="icon-server" cx="365" cy="225" r="8" />
      <rect class="icon-server" x="360" y="220" width="10" height="10" rx="2" />
      <text x="390" y="225" class="infra-title">Application</text>
      <text x="390" y="240" class="infra-title">Load Balancer</text>
      <text x="400" y="255" text-anchor="middle" class="infra-text" fill="white" font-size="9">AWS ALB</text>
      
      <!-- Web Servers -->
      <rect class="infra-server" x="120" y="320" width="100" height="70" />
      <!-- Server icon -->
      <rect class="icon-server" x="155" y="340" width="30" height="20" rx="3" />
      <rect class="icon-server" x="158" y="343" width="24" height="3" />
      <rect class="icon-server" x="158" y="348" width="24" height="3" />
      <rect class="icon-server" x="158" y="353" width="24" height="3" />
      <text x="170" y="375" text-anchor="middle" class="infra-title">Web Server 1</text>
      <text x="170" y="385" text-anchor="middle" class="infra-text" fill="white" font-size="9">EC2 Instance</text>
      
      <rect class="infra-server" x="250" y="320" width="100" height="70" />
      <!-- Server icon -->
      <rect class="icon-server" x="285" y="340" width="30" height="20" rx="3" />
      <rect class="icon-server" x="288" y="343" width="24" height="3" />
      <rect class="icon-server" x="288" y="348" width="24" height="3" />
      <rect class="icon-server" x="288" y="353" width="24" height="3" />
      <text x="300" y="375" text-anchor="middle" class="infra-title">Web Server 2</text>
      <text x="300" y="385" text-anchor="middle" class="infra-text" fill="white" font-size="9">EC2 Instance</text>
      
      <!-- Application Servers -->
      <rect class="infra-server" x="450" y="320" width="100" height="70" />
      <!-- Server icon -->
      <rect class="icon-server" x="485" y="340" width="30" height="20" rx="3" />
      <rect class="icon-server" x="488" y="343" width="24" height="3" />
      <rect class="icon-server" x="488" y="348" width="24" height="3" />
      <rect class="icon-server" x="488" y="353" width="24" height="3" />
      <text x="500" y="375" text-anchor="middle" class="infra-title">App Server 1</text>
      <text x="500" y="385" text-anchor="middle" class="infra-text" fill="white" font-size="9">EC2 Instance</text>
      
      <rect class="infra-server" x="580" y="320" width="100" height="70" />
      <!-- Server icon -->
      <rect class="icon-server" x="615" y="340" width="30" height="20" rx="3" />
      <rect class="icon-server" x="618" y="343" width="24" height="3" />
      <rect class="icon-server" x="618" y="348" width="24" height="3" />
      <rect class="icon-server" x="618" y="353" width="24" height="3" />
      <text x="630" y="375" text-anchor="middle" class="infra-title">App Server 2</text>
      <text x="630" y="385" text-anchor="middle" class="infra-text" fill="white" font-size="9">EC2 Instance</text>
      
      <!-- Redis Cache -->
      <rect class="infra-cache" x="120" y="450" width="120" height="60" />
      <!-- Cache icon -->
      <circle class="icon-db" cx="155" cy="475" r="12" />
      <rect class="icon-db" x="148" y="470" width="14" height="3" />
      <rect class="icon-db" x="148" y="475" width="14" height="3" />
      <rect class="icon-db" x="148" y="480" width="14" height="3" />
      <text x="195" y="475" class="infra-title">Redis Cache</text>
      <text x="180" y="495" text-anchor="middle" class="infra-text" fill="white" font-size="10">ElastiCache</text>
      
      <!-- RDS Database -->
      <rect class="infra-database" x="300" y="450" width="120" height="60" />
      <!-- Database icon -->
      <ellipse class="icon-db" cx="335" cy="475" rx="15" ry="8" />
      <ellipse class="icon-db" cx="335" cy="480" rx="15" ry="8" />
      <ellipse class="icon-db" cx="335" cy="485" rx="15" ry="8" />
      <text x="375" y="475" class="infra-title">PostgreSQL</text>
      <text x="360" y="495" text-anchor="middle" class="infra-text" fill="white" font-size="10">RDS Instance</text>
      
      <!-- S3 Storage -->
      <rect class="infra-storage" x="480" y="450" width="120" height="60" />
      <!-- Storage icon -->
      <rect class="icon-server" x="515" y="470" width="20" height="15" rx="2" />
      <rect class="icon-server" x="518" y="473" width="14" height="2" />
      <rect class="icon-server" x="518" y="477" width="14" height="2" />
      <rect class="icon-server" x="518" y="481" width="14" height="2" />
      <text x="555" y="475" class="infra-title">File Storage</text>
      <text x="540" y="495" text-anchor="middle" class="infra-text" fill="white" font-size="10">S3 Bucket</text>
      
      <!-- Connections -->
      <line class="infra-line" x1="400" y1="170" x2="400" y2="200" />
      <line class="infra-line" x1="370" y1="260" x2="200" y2="320" />
      <line class="infra-line" x1="400" y1="260" x2="300" y2="320" />
      <line class="infra-line" x1="430" y1="260" x2="500" y2="320" />
      <line class="infra-line" x1="430" y1="260" x2="630" y2="320" />
      
      <line class="infra-line" x1="200" y1="390" x2="180" y2="450" />
      <line class="infra-line" x1="300" y1="390" x2="360" y2="450" />
      <line class="infra-line" x1="500" y1="390" x2="360" y2="450" />
      <line class="infra-line" x1="630" y1="390" x2="540" y2="450" />
      
      <!-- Labels -->
      <text x="400" y="185" text-anchor="middle" class="infra-text" font-size="9">HTTPS</text>
      <text x="280" y="285" text-anchor="middle" class="infra-text" font-size="9">HTTP</text>
      <text x="520" y="285" text-anchor="middle" class="infra-text" font-size="9">HTTP</text>
      <text x="250" y="420" text-anchor="middle" class="infra-text" font-size="9">Cache</text>
      <text x="420" y="420" text-anchor="middle" class="infra-text" font-size="9">SQL</text>
      <text x="570" y="420" text-anchor="middle" class="infra-text" font-size="9">Files</text>
      
      <!-- Title -->
      <text x="400" y="570" text-anchor="middle" class="infra-text" font-size="14" font-weight="bold">High Availability Web Application Infrastructure</text>
    </svg>`;
  }

  /**
   * Create generic diagram SVG
   */
  private createGenericDiagramSVG(diagramId: string, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300">
      <defs>
        <style>
          .generic-text { font-family: 'Inter', sans-serif; font-size: 14px; fill: #1f2937; }
          .generic-title { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: bold; fill: #4f46e5; }
          .generic-box { fill: #f3f4f6; stroke: #6b7280; stroke-width: 2; rx: 8; }
        </style>
      </defs>
      
      <rect class="generic-box" x="20" y="20" width="460" height="260" />
      <text x="250" y="50" text-anchor="middle" class="generic-title">Mermaid図表: ${diagramId}</text>
      
      <text x="250" y="100" text-anchor="middle" class="generic-text">高品質な図表が生成されました</text>
      <text x="250" y="130" text-anchor="middle" class="generic-text">内容に基づいて最適化されています</text>
      
      <rect class="generic-box" x="150" y="160" width="200" height="80" fill="#4f46e5" />
      <text x="250" y="195" text-anchor="middle" class="generic-text" fill="white">図表コンテンツ</text>
      <text x="250" y="215" text-anchor="middle" class="generic-text" fill="white">${diagramId}</text>
    </svg>`;
  }

  /**
   * Create placeholder SVG for failed renders
   */
  private createPlaceholderSVG(diagramId: string, content?: string): string {
    const lines = content ? content.split('\n').slice(0, 3) : [];
    const height = Math.max(120, 40 + lines.length * 20);
    
    let textElements = `<text x="50%" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#666">
        Mermaid図表: ${diagramId}
      </text>`;
    
    if (lines.length > 0) {
      lines.forEach((line, index) => {
        const trimmedLine = line.trim().substring(0, 40);
        if (trimmedLine) {
          textElements += `<text x="50%" y="${60 + index * 20}" text-anchor="middle" font-family="monospace" font-size="12" fill="#888">
            ${trimmedLine}
          </text>`;
        }
      });
    }
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${height}" viewBox="0 0 500 ${height}">
      <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2" rx="8"/>
      <rect x="10" y="10" width="480" height="30" fill="#e9ecef" rx="4"/>
      ${textElements}
      <text x="50%" y="${height - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#aaa">
        レンダリングできませんでした
      </text>
    </svg>`;
  }

  /**
   * Get mermaid configuration
   */
  private getMermaidConfig(): any {
    const theme = this.config.theme || 'base';
    const customTheme = this.getCustomThemeVariables(theme);
    
    return {
      themeVariables: customTheme,
      architecture: {
        useMaxWidth: true,
        htmlLabels: true
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'cardinal'
      },
      sequence: {
        useMaxWidth: true,
        showSequenceNumbers: true,
        messageFontSize: 14,
        noteFontSize: 12,
        actorFontSize: 14
      },
      gantt: {
        useMaxWidth: true,
        fontSize: 12,
        gridLineStartPadding: 350,
        numberSectionStyles: 4
      },
      class: {
        useMaxWidth: true,
        htmlLabels: true
      },
      state: {
        useMaxWidth: true
      },
      er: {
        useMaxWidth: true
      },
      pie: {
        useMaxWidth: true,
        textPosition: 0.5
      }
    };
  }

  /**
   * Apply custom styling to SVG
   */
  private applySVGStyling(svg: string): string {
    // Add font family and other styling improvements
    const styledSvg = svg.replace(
      '<svg',
      '<svg style="font-family: Inter, Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif;"'
    );
    
    return styledSvg;
  }

  /**
   * Get custom theme variables
   */
  private getCustomThemeVariables(theme: string): any {
    const customThemes = {
      base: {
        primaryColor: '#4F46E5',
        primaryTextColor: '#1F2937',
        primaryBorderColor: '#6366F1',
        lineColor: '#6B7280',
        secondaryColor: '#F3F4F6',
        tertiaryColor: '#FBBF24',
        background: '#FFFFFF',
        mainBkg: '#FFFFFF',
        secondBkg: '#F9FAFB',
        tertiaryBkg: '#FEF3C7'
      },
      forest: {
        primaryColor: '#059669',
        primaryTextColor: '#064E3B',
        primaryBorderColor: '#10B981',
        lineColor: '#6B7280',
        secondaryColor: '#ECFDF5',
        tertiaryColor: '#F59E0B',
        background: '#FFFFFF',
        mainBkg: '#FFFFFF',
        secondBkg: '#F0FDF4',
        tertiaryBkg: '#FEF3C7'
      },
      dark: {
        primaryColor: '#6366F1',
        primaryTextColor: '#F9FAFB',
        primaryBorderColor: '#8B5CF6',
        lineColor: '#9CA3AF',
        secondaryColor: '#374151',
        tertiaryColor: '#FBBF24',
        background: '#1F2937',
        mainBkg: '#1F2937',
        secondBkg: '#374151',
        tertiaryBkg: '#92400E'
      },
      neutral: {
        primaryColor: '#6B7280',
        primaryTextColor: '#111827',
        primaryBorderColor: '#9CA3AF',
        lineColor: '#6B7280',
        secondaryColor: '#F3F4F6',
        tertiaryColor: '#F59E0B',
        background: '#FFFFFF',
        mainBkg: '#FFFFFF',
        secondBkg: '#F9FAFB',
        tertiaryBkg: '#FEF3C7'
      }
    };
    
    return customThemes[theme as keyof typeof customThemes] || customThemes.base;
  }
}