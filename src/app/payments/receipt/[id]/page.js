import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Official Receipt Print - PADEMCO",
};

export default async function ReceiptPrintPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (!id) notFound();

  // Load payment with complete relations
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      loan: {
        include: {
          booking: {
            include: {
              employee: { include: { office: true } },
              airline: true,
            },
          },
        },
      },
      cashier: true,
    },
  });

  if (!payment) notFound();

  // If user is a VIEWER, restrict access to only their own receipts
  if (session.role === "VIEWER" && payment.loan.booking.employeeId !== session.employeeId) {
    redirect("/");
  }

  // Load System Settings
  const settingsList = await db.systemSetting.findMany();
  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  const orgName = settings.org_name || "PADEMCO Multi-Purpose Cooperative";
  const orgAddress = settings.org_address || "DENR Compound, Daet, Camarines Norte";

  return (
    <div className="bg-white min-h-screen p-8 max-w-3xl mx-auto border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Top Header Branding */}
      <div className="text-center pb-6 border-b-2 border-slate-800 space-y-1">
        <h1 className="text-xl font-extrabold tracking-wider uppercase text-slate-800">
          {orgName}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {orgAddress}
        </p>
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
          PADEMCO Airline Flight Bookings & Installments
        </p>
        <div className="pt-4">
          <span className="inline-block border-2 border-slate-800 px-6 py-1.5 text-sm font-black tracking-widest uppercase text-slate-800 bg-slate-50">
            Official Receipt
          </span>
        </div>
      </div>

      {/* Meta details grid */}
      <div className="grid grid-cols-2 gap-8 py-6 text-sm">
        <div className="space-y-2">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Received From (Borrower):</span>
            <span className="font-extrabold text-base text-slate-800 block">
              {payment.loan.booking.employee.fullName}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Office / Unit:</span>
            <span className="font-bold text-slate-700 block">
              {payment.loan.booking.employee.office.name}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Employee ID:</span>
            <span className="font-mono text-xs text-slate-600 block">
              {payment.loan.booking.employee.employeeId}
            </span>
          </div>
          {payment.loan.booking.passengerName && (
            <div className="mt-3 pt-3 border-t border-dashed border-slate-300">
              <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest block">🎫 Comaker / Relative Ticket</span>
              <span className="font-bold text-slate-800 block text-sm mt-0.5">
                Passenger: {payment.loan.booking.passengerName}
              </span>
              <span className="text-xs text-slate-500 font-semibold block">
                ({payment.loan.booking.passengerRelationship} of borrower)
              </span>
              <span className="text-[9px] text-slate-400 font-medium block mt-0.5 italic">
                Loan & payment obligation is legally bound to the employee borrower above.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-right">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">OR Number:</span>
            <span className="font-black text-lg text-danger font-mono block">
              {payment.receiptNumber}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Receipt Date:</span>
            <span className="font-bold text-slate-700 block">
              {payment.paymentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Payment Method:</span>
            <span className="font-bold text-slate-700 uppercase block font-mono">
              {payment.paymentMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Booking Flight Details & Financial Breakdown Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
        <table className="min-w-full divide-y divide-slate-300 text-left text-sm">
          <thead className="bg-slate-50 font-bold text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5">Flight Ledger Description</th>
              <th scope="col" className="px-4 py-2.5 text-right">Reference Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            <tr>
              <td className="px-4 py-3">
                <span className="font-bold text-slate-800 block">Flight Advanced Booking</span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Route: {payment.loan.booking.destination} | Carrier: {payment.loan.booking.airline.name}
                </span>
                {payment.loan.booking.passengerName && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    🎫 Passenger: {payment.loan.booking.passengerName} ({payment.loan.booking.passengerRelationship})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">
                Ref: {payment.loan.booking.referenceNumber}
              </td>
            </tr>
            {session.role !== "VIEWER" && (
              <>
                <tr>
                  <td className="px-4 py-3 text-slate-500 font-medium">Ticket Base Cost</td>
                  <td className="px-4 py-3 text-right font-mono">
                    ₱{payment.loan.booking.ticketCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {payment.loan.booking.serviceFee > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-slate-500 font-medium">Cooperative Service Fee</td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₱{payment.loan.booking.serviceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-3 text-slate-500 font-medium">
                    Interest / Cooperative Profit ({payment.loan.interestType === "PERCENT" ? `${payment.loan.interestRate}%` : "Fixed"})
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ₱{payment.loan.interestAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </>
            )}
            <tr className="bg-slate-50/50">
              <td className="px-4 py-3 font-bold text-slate-800">
                {session.role === "VIEWER" ? "Total Loan Amount" : "Total Loan Principal & Profit"}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                ₱{payment.loan.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="bg-primary-light">
              <td className="px-4 py-3 font-black text-primary">Amount Paid in this OR</td>
              <td className="px-4 py-3 text-right font-mono font-black text-success text-base">
                ₱{payment.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-bold text-slate-600">Remaining Loan Balance</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                ₱{payment.loan.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Remarks */}
      {payment.remarks && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-4 text-xs">
          <span className="font-bold text-slate-500 block uppercase mb-1">Cashier Remarks / Notes:</span>
          <span className="text-slate-700">{payment.remarks}</span>
        </div>
      )}

      {/* Signature Lines */}
      <div className="grid grid-cols-2 gap-16 pt-16 text-center text-xs">
        <div className="space-y-1">
          <div className="border-b border-slate-800 mx-auto w-48 h-8 flex items-end justify-center font-bold text-slate-700">
            {payment.loan.booking.employee.fullName}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Employee Signature
          </span>
        </div>
        <div className="space-y-1">
          <div className="border-b border-slate-800 mx-auto w-48 h-8 flex items-end justify-center font-bold text-primary">
            {payment.cashier.name}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Coop Cashier / Received By
          </span>
        </div>
      </div>

      {/* Footer message */}
      <div className="text-center text-[10px] text-slate-400 pt-16 border-t border-slate-100 mt-12 space-y-1 no-print">
        <p>This is a computer-generated official receipt from PADEMCO Airline Loan Monitoring System.</p>
        <p className="font-bold text-slate-500">Press CTRL + P or click print in your browser toolbar to print.</p>
      </div>

      {/* Auto-print trigger scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          `,
        }}
      />
    </div>
  );
}
