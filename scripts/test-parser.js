const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const xml = fs.readFileSync(process.argv[2], 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, isArray: (name) => name === 'error' || name === 'location' });
const parsed = parser.parse(xml);
const errors = parsed.results?.error ?? [];
console.log('Errors count:', errors.length);
if (errors.length > 0) {
    const err = errors[0];
    console.log('First error keys:', Object.keys(err));
    const locs = err.location ?? [];
    console.log('locations count:', locs.length);
    if (locs.length > 0) {
        console.log('first loc:', JSON.stringify(locs[0]));
    }
}