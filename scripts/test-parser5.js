const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const xml = fs.readFileSync('D:\\developer\\2025\\Backend\\research\\workspace\\projects\\active\\sast-integration\\scripts\\test-cppcheck.xml', 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, isArray: (name) => name === 'error' || name === 'location' });
const parsed = parser.parse(xml);

// Simulate the parser logic
const parsedObj = parsed;
const resultsObj = parsedObj.results;
const errorsContainer = resultsObj?.errors ?? resultsObj;
const errors = errorsContainer?.error ?? errorsContainer ?? [];
const errorList = Array.isArray(errors) ? errors : [errors];

console.log('errorList count:', errorList.length);
for (const err of errorList.slice(0, 3)) {
    const attrs = err['@_'] ?? err;
    const id = attrs?.['@_id'] ?? attrs?.id ?? 'cppcheck-unknown';
    const severityRaw = attrs?.['@_severity'] ?? attrs?.severity ?? 'medium';
    const msg = attrs?.['@_msg'] ?? attrs?.msg ?? '';
    
    let locations = err.location ?? [];
    if (!Array.isArray(locations)) locations = [locations];
    const firstLoc = locations[0] ?? {};
    const locAttrs = firstLoc['@_'] ?? firstLoc;
    const filePath = locAttrs?.['@_file'] ?? locAttrs?.file ?? null;
    const line = locAttrs?.['@_line'] ? parseInt(locAttrs['@_line'], 10) : null;
    
    console.log('id:', id, 'severity:', severityRaw, 'file:', filePath, 'line:', line);
}