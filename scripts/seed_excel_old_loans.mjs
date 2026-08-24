import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import crypto from 'crypto';

// Load .env
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[k.trim()] = val;
  }
});

const { db } = await import('../src/lib/db.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function seedExcelOldLoans() {
  console.log('--- ABSORBING ACTUAL OLD LOAN TICKETS FROM EXCEL SCHEDULE ---');
  
  const excelPath = path.join(__dirname, '..', 'Schedule-6-SL-Ticketing-Final-CY-2026 (1).xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found at: ${excelPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const sheet = workbook.worksheets[0];

  console.log(`Sheet "${sheet.name}" loaded. Total rows: ${sheet.rowCount}`);

  const tickets = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    
    const c1_date = getVal(row.getCell(1));
    const c2_checkNo = getVal(row.getCell(2));
    const c3_payee = getVal(row.getCell(3));
    const c4_extra = getVal(row.getCell(4));
    const c5_dr = getVal(row.getCell(5));
    const c6_cr = getVal(row.getCell(6));
    const c7_incIns = getVal(row.getCell(7));
    const c8_markup = getVal(row.getCell(8));
    const c9_totalTicket = getVal(row.getCell(9));
    const c10_penalty = getVal(row.getCell(10));
    const c11_payDate = getVal(row.getCell(11));
    const c12_orNo = getVal(row.getCell(12));
    const c13_paidPenalty = getVal(row.getCell(13));
    const c14_insVia = getVal(row.getCell(14));
    const c15_insInc = getVal(row.getCell(15));
    const c16_paidMarkup = getVal(row.getCell(16));
    const c17_baggage = getVal(row.getCell(17));
    const c18_ticketPurchased = getVal(row.getCell(18));
    const c19_paidTotal = getVal(row.getCell(19));
    const c20_unpaidBal = getVal(row.getCell(20));

    const payeeStr = c3_payee ? String(c3_payee).trim() : '';
    const dateStr = c1_date ? String(c1_date).trim() : '';
    
    const isHeaderOrTitle = 
      payeeStr.includes('PADEMCO') ||
      payeeStr.includes('SCHEDULE') ||
      payeeStr.includes('AS OF') ||
      payeeStr === 'PAYEE' ||
      dateStr === 'DATE' ||
      dateStr.includes('BALANCE FORWARDED') ||
      payeeStr.toUpperCase().includes('TOTAL') ||
      dateStr.toUpperCase().includes('TOTAL');

    const hasData = (c5_dr !== null || c9_totalTicket !== null || c20_unpaidBal !== null);

    if (!isHeaderOrTitle && payeeStr && hasData) {
      let parsedDate = null;
      if (c1_date instanceof Date) {
        parsedDate = c1_date;
      } else if (c1_date) {
        const cleanedStr = cleanDateStr(c1_date);
        if (cleanedStr) {
          const d = new Date(cleanedStr);
          if (!isNaN(d.getTime())) parsedDate = d;
        }
      }

      tickets.push({
        excelRow: r,
        ticketDate: parsedDate,
        rawDate: c1_date,
        checkNumber: c2_checkNo ? String(c2_checkNo).trim() : null,
        payeeName: payeeStr,
        payeeExtra: c4_extra ? String(c4_extra).trim() : null,
        drAmount: num(c5_dr),
        crAmount: num(c6_cr),
        insuranceIncome: num(c7_incIns) || num(c15_insInc),
        markupAmount: num(c8_markup),
        totalTicketAmount: num(c9_totalTicket),
        penaltyAmount: num(c10_penalty),
        paymentDateStr: c11_payDate ? String(c11_payDate).trim() : null,
        orNumber: c12_orNo ? String(c12_orNo).trim() : null,
        paidPenalty: num(c13_paidPenalty),
        insuranceVia: num(c14_insVia),
        paidMarkup: num(c16_paidMarkup),
        baggageFee: num(c17_baggage),
        ticketPurchasedPaid: num(c18_ticketPurchased),
        paidTotal: num(c19_paidTotal),
        unpaidBalance: num(c20_unpaidBal)
      });
    }
  }

  console.log(`Parsed ${tickets.length} valid ticket records from Excel file.`);

  // 1. Get Default Office & Bookkeeper User
  let defaultOffice = await db.office.findFirst();
  if (!defaultOffice) {
    defaultOffice = await db.office.create({ data: { name: 'PENRO Palawan' } });
  }

  const defaultPasswordHash = hashPassword('employee123');

  let bookkeeperUser = await db.user.findFirst({
    where: { role: 'BOOKKEEPER' }
  });
  if (!bookkeeperUser) {
    bookkeeperUser = await db.user.create({
      data: {
        username: 'bookkeeper',
        name: 'Maria Santos (Bookkeeper)',
        passwordHash: hashPassword('pademco123'),
        role: 'BOOKKEEPER',
        status: 'APPROVED'
      }
    });
  }

  // 2. Fetch all existing employees & users in 1 query
  const existingEmployees = await db.employee.findMany({
    include: { user: true }
  });
  const empMap = new Map();
  existingEmployees.forEach(e => {
    empMap.set(e.fullName.toUpperCase().trim(), e);
  });

  const uniquePayeeNames = Array.from(new Set(tickets.map(t => t.payeeName)));
  console.log(`Ensuring Employee / User accounts for ${uniquePayeeNames.length} unique borrowers...`);

  let empCounter = 1000 + existingEmployees.length;
  for (const rawName of uniquePayeeNames) {
    const normKey = rawName.toUpperCase().trim();
    if (!empMap.has(normKey)) {
      empCounter++;
      const empCode = `EMP-OLD-${empCounter}`;
      const baseUsername = rawName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
      let username = baseUsername || `user.${empCounter}`;

      let existingUser = await db.user.findUnique({ where: { username } });
      let suffix = 1;
      while (existingUser) {
        username = `${baseUsername}${suffix}`;
        existingUser = await db.user.findUnique({ where: { username } });
        suffix++;
      }

      const createdEmp = await db.employee.create({
        data: {
          employeeId: empCode,
          fullName: rawName.trim(),
          officeId: defaultOffice.id,
          position: 'Borrower',
          contactNumber: 'N/A',
          status: 'ACTIVE',
          user: {
            create: {
              username,
              name: rawName.trim(),
              passwordHash: defaultPasswordHash,
              role: 'VIEWER',
              status: 'APPROVED'
            }
          }
        },
        include: { user: true }
      });

      empMap.set(normKey, createdEmp);
    }
  }

  // 3. Clear old test OldLoan records
  console.log('Clearing old test OldLoan records...');
  await db.oldLoanPayment.deleteMany({});
  await db.oldLoan.deleteMany({});

  // 4. Prepare data for createMany
  console.log(`Preparing bulk insert data for ${tickets.length} ticket records...`);
  const createManyData = [];

  let totalTicketSum = 0;
  let totalPaidSum = 0;
  let totalUnpaidSum = 0;

  for (const t of tickets) {
    const normKey = t.payeeName.toUpperCase().trim();
    const emp = empMap.get(normKey);
    if (!emp) {
      console.warn(`Could not find employee mapping for: ${t.payeeName}`);
      continue;
    }

    createManyData.push({
      employeeId: emp.id,
      ticketDate: t.ticketDate,
      checkNumber: t.checkNumber,
      payeeName: t.payeeName,
      payeeExtra: t.payeeExtra,
      drAmount: t.drAmount,
      crAmount: t.crAmount,
      insuranceIncome: t.insuranceIncome,
      markupAmount: t.markupAmount,
      totalTicketAmount: t.totalTicketAmount,
      penaltyAmount: t.penaltyAmount,
      paymentDateStr: t.paymentDateStr,
      orNumber: t.orNumber,
      paidPenalty: t.paidPenalty,
      insuranceVia: t.insuranceVia,
      paidMarkup: t.paidMarkup,
      baggageFee: t.baggageFee,
      ticketPurchasedPaid: t.ticketPurchasedPaid,
      paidTotal: t.paidTotal,
      unpaidBalance: t.unpaidBalance,
      totalOldLoans: 1,
      estimatedAmount: t.totalTicketAmount,
      dateSince: t.ticketDate,
      encodedById: bookkeeperUser.id,
      remarks: t.checkNumber ? `Check #: ${t.checkNumber}` : (t.orNumber ? `OR #: ${t.orNumber}` : null)
    });

    totalTicketSum += t.totalTicketAmount;
    totalPaidSum += t.paidTotal;
    totalUnpaidSum += t.unpaidBalance;
  }

  console.log(`Executing createMany for ${createManyData.length} records...`);
  const result = await db.oldLoan.createMany({
    data: createManyData
  });

  console.log('\n========================================');
  console.log('  DATA ABSORPTION SUCCESSFUL!');
  console.log('========================================');
  console.log(`Total Records Seeded:   ${result.count}`);
  console.log(`Unique Borrowers:       ${uniquePayeeNames.length}`);
  console.log(`Total Ticket Value:     ₱${totalTicketSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Paid / Collected: ₱${totalPaidSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Outstanding Bal:  ₱${totalUnpaidSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log('========================================\n');

  process.exit(0);
}

function getVal(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  let val = cell.value;
  if (typeof val === 'object') {
    if (val.result !== undefined) val = val.result;
    else if (val.text !== undefined) val = val.text;
    else if (val.date !== undefined) val = val.date;
    else if (val.formula !== undefined) val = val.result;
  }
  return val;
}

function num(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function cleanDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      let m = parts[0].padStart(2, '0');
      let d = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
  }
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 3) {
      let m = parts[0].padStart(2, '0');
      let d = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
  }
  return s;
}

seedExcelOldLoans().catch(err => {
  console.error('Error seeding old loans:', err);
  process.exit(1);
});
