
// Part Number Generator Service
const PartNumberService = {
  categoryPrefixes: {
    'IC': 'IC',
    'Resistor': 'R',
    'Capacitor': 'C',
    'Inductor': 'L',
    'Diode': 'D',
    'Transistor': 'Q',
    'Tank': 'TA',
    'Pump': 'PU',
    'Sensor': 'SE',
    'Hardware': 'HW',
    'PCB': 'PCB',
    'Cable': 'CA',
    'Connector': 'CN',
    'Other': 'OT'
  },

  generatePartNumber: (category: string, existingNumbers: string[] = []) => {
    const prefix = (PartNumberService.categoryPrefixes as any)[category] || 'OT';
    const existingWithPrefix = existingNumbers
      .filter((num: string) => num.startsWith(prefix))
      .map((num: string) => {
        const parts = num.split('-');
        return parts.length >= 3 ? parseInt(parts[2]) : 0;
      })
      .filter((num: number) => !isNaN(num));

    const nextNumber = existingWithPrefix.length > 0 ? Math.max(...existingWithPrefix) + 1 : 1;
    return `${prefix}-001-${String(nextNumber).padStart(3, '0')}`;
  }
};

export default PartNumberService;