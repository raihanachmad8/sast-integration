import { XMLParser } from 'fast-xml-parser';
import { type NewFinding } from '@drizzle/schema/findings';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  isArray: (name) => name === 'error' || name === 'location',
});

/**
 * Parse Cppcheck XML output into normalized findings using fast-xml-parser.
 * Supports Cppcheck 1.x and 2.x XML formats.
 */
export function parseCppcheck(
  xmlContent: string | Buffer,
  scanId: string,
  scanner: string = 'cppcheck'
): { findings: NewFinding[]; summary: Record<string, number> } {
  const text = typeof xmlContent === 'string' ? xmlContent : xmlContent.toString('utf8');

  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  let parsed: unknown;
  try {
    parsed = xmlParser.parse(text);
  } catch (e) {
    console.error('Failed to parse Cppcheck XML:', e);
    return { findings, summary: severityCount };
  }

  // Cppcheck XML structure can vary: results > error[] or direct <error>
  const parsedObj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
  const errorsRaw = (parsedObj as Record<string, unknown>).results ?? parsedObj;
  const errors = (errorsRaw as Record<string, unknown>)?.error ?? errorsRaw ?? [];

  const errorList = Array.isArray(errors) ? errors : [errors];

  for (const err of errorList) {
    if (!err) continue;

    const attrs = err['@_'] || err; // fast-xml-parser puts attrs under @_
    const id = attrs?.id || attrs?.['@_id'] || 'cppcheck-unknown';
    const severityRaw = attrs?.severity || attrs?.['@_severity'] || 'medium';
    const msg = attrs?.msg || attrs?.['@_msg'] || attrs?.verbose || '';
    const cwe = attrs?.cwe || attrs?.['@_cwe'];

    // Locations can be array or single
    let locations = err.location || [];
    if (!Array.isArray(locations)) locations = [locations];

    const firstLoc = locations[0] || {};
    const locAttrs = firstLoc['@_'] || firstLoc;

    const filePath = locAttrs?.file || locAttrs?.['@_file'] || null;
    const line = locAttrs?.line ? parseInt(locAttrs.line, 10) : (locAttrs?.['@_line'] ? parseInt(locAttrs['@_line'], 10) : null);

    const severity = mapCppcheckSeverity(severityRaw);

    if (severity in severityCount) {
      severityCount[severity as keyof typeof severityCount]++;
    }

    findings.push({
      scan_id: scanId,
      scanner,
      rule: id,
      severity,
      file_path: filePath,
      line_number: line,
      message: msg,
      description: msg,
      cwe_id: cwe ? String(cwe) : null,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return { findings, summary: severityCount };
}

function mapCppcheckSeverity(sev: string): string {
  const s = String(sev).toLowerCase();
  if (s === 'error') return 'high';
  if (s === 'warning') return 'medium';
  if (s === 'style' || s === 'performance' || s === 'portability') return 'low';
  if (s === 'information') return 'info';
  return 'medium';
}
