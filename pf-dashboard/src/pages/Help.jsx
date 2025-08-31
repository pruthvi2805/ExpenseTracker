import { HomeIcon, ClipboardDocumentListIcon, BanknotesIcon, Cog6ToothIcon, LightBulbIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

export default function Help() {
  return (
    <div className="prose prose-sm max-w-none">
      <h1 className="text-xl font-semibold mb-3">How to use</h1>

      <p className="text-gray-700">Expense Tracker is a local‑first budgeting tool that runs entirely in your browser. Your data is saved privately in your browser (IndexedDB) — no accounts or servers. Use the month picker in the header to move between months; each month has its own Plan, Actuals and Income totals.</p>

      <h2 className="font-semibold mt-6">Quick start</h2>
      <ol className="list-decimal pl-5 text-gray-700">
        <li>Open <b>Budget</b> and enter amounts in the <b>Planned</b> column for the categories you care about.</li>
        <li>As the month progresses, update the <b>Actual</b> column. Everything auto‑saves.</li>
        <li>Open <b>Income</b> and fill your five monthly totals (blank = 0).</li>
        <li>Check <b>Dashboard</b> for Net Cash, Savings and Budget Status.</li>
      </ol>

      <h2 className="font-semibold mt-6 inline-flex items-center gap-2"><HomeIcon className="w-5 h-5"/>Dashboard</h2>
      <ul className="list-disc pl-5 text-gray-700">
        <li><b>Tiles</b>: Income (from <b>Income</b>), Planned Spend and <b>Spend</b> (consumption only from <b>Budget</b>), and <b>Net Cash</b> = Income − Spend − Investment contributions.</li>
        <li><b>Savings</b>: 
          <ul className="pl-5 list-disc">
            <li><b>Current savings</b>: What you have now (set in <b>Settings</b>).</li>
            <li><b>After Month (Cash)</b>: <i>Current savings + Net Cash</i>. This is your projected end‑of‑month cash balance.</li>
            <li><b>Minimum</b>: The lowest savings you are comfortable with (set in <b>Settings</b>). If After Month &lt; Minimum, the value turns red.</li>
          </ul>
        </li>
        <li><b>Budget Status</b>: Shows <i>Actual − Plan</i> for consumption sections (Fixed, Variable, Loans). <b>Allocations</b> (Savings/Investments) are shown separately where <i>higher actual is better</i>.
          <ul className="pl-5 list-disc">
            <li><span className="text-red-600">Red</span> = <b>Overbudget</b>; <span className="text-emerald-600">green</span> = <b>Underbudget</b>; gray = <b>On plan</b>.</li>
            <li>Fixed, Variable and Loans each show their own delta, plus a total line for the combined effect.</li>
            <li>Example: Fixed +€100, Variable −€150, Loans €0 → <b>Total underbudget €50</b>.</li>
          </ul>
        </li>
        <li><b>Spend Mix</b>: How your Actual consumption splits across Fixed, Variable and Loans (excludes allocations).</li>
        <li><b>Expenses by category</b>: Collapsible list; expand to see a breakdown. When expanded you’ll see a simple pie with a legend and amounts.</li>
        <li><b>3‑Month Trend</b>: Actual vs Planned consumption totals for recent months.</li>
      </ul>

      <h2 className="font-semibold mt-6 inline-flex items-center gap-2"><ClipboardDocumentListIcon className="w-5 h-5"/>Budget</h2>
      <p className="text-gray-700">Plan your month and record what you actually spend or allocate. Everything auto‑saves after a short pause. If you prefer, you can copy last month’s plan and then tweak it.</p>
      <ul className="list-disc pl-5 text-gray-700">
        <li><b>Tabs</b>:
          <ul className="pl-5 list-disc">
            <li><b>Fixed</b>: Predictable monthly bills — rent/mortgage, utilities, insurance.</li>
            <li><b>Variable</b>: Day‑to‑day flexible costs — groceries, dining, transport.</li>
            <li><b>Loans</b>: Loan repayments — car, personal, other.</li>
            <li><b>Allocations</b>: Savings transfer and investment contributions (non‑consumption).</li>
          </ul>
        </li>
        <li><b>Columns</b>: Subcategory | Planned | Actual | Δ. For expenses, Δ is <i>Actual − Plan</i> (red = overspend, green = under plan). For allocations, higher Actual is green.</li>
        <li><b>Totals strip</b>: For the active tab — shows Plan • Actual • Δ/Progress.</li>
        <li><b>Custom subcategories</b>: Add your own. You can delete a custom row when both Plan and Actual are 0.</li>
        <li><b>Quick actions</b>: Copy last month’s plan, prefill actuals (useful for fixed/loan bills), and Clear all.</li>
        <li><b>Validation</b>: Amounts accept up to 2 decimals; negatives are blocked. Blank means 0.</li>
      </ul>

      <h2 className="font-semibold mt-6 inline-flex items-center gap-2"><BanknotesIcon className="w-5 h-5"/>Income</h2>
      <ul className="list-disc pl-5 text-gray-700">
        <li>Enter monthly totals per source: <b>Salary</b>, <b>Rent</b>, <b>Reimbursements</b>, <b>Investment returns</b>, <b>Other</b>. Leave blank for zero.</li>
        <li>Monthly totals override any itemized incomes you’ve added before.</li>
        <li>All changes auto‑save; Total Income updates live and feeds the Dashboard Net Cash and Savings cards.</li>
        <li>Use Notes to add details (especially for Other).</li>
      </ul>

      <h2 className="font-semibold mt-6 inline-flex items-center gap-2"><Cog6ToothIcon className="w-5 h-5"/>Settings</h2>
      <ul className="list-disc pl-5 text-gray-700">
        <li><b>Currency</b>: Controls all currency symbols/formatting.</li>
        <li><b>Salary day</b>: Optional reference day (reserved for future features like reminders).</li>
        <li><b>Current / Minimum savings</b>: These drive the Savings card on Dashboard.
          <ul className="pl-5 list-disc">
            <li><b>Current</b> — your current cash savings.</li>
            <li><b>Minimum</b> — the lowest cash savings you’re comfortable with.</li>
          </ul>
        </li>
        <li>
          <b>Backup</b>:{' '}
          <span className="inline-flex items-center gap-1 align-middle">
            <ArrowDownTrayIcon className="w-4 h-4"/><span>Export JSON</span>
          </span>{' '}for safekeeping, and{' '}
          <span className="inline-flex items-center gap-1 align-middle">
            <ArrowUpTrayIcon className="w-4 h-4"/><span>Import JSON</span>
          </span>{' '}to restore. Backups include plan, actuals, income totals, and custom categories.
        </li>
      </ul>

      <h2 className="font-semibold mt-6 inline-flex items-center gap-2"><LightBulbIcon className="w-5 h-5"/>Tips</h2>
      <ul className="list-disc pl-5 text-gray-700">
        <li><b>Start small</b>: A simple Plan (Fixed + a few Variable buckets) goes a long way. You can refine later.</li>
        <li><b>Separate predictable vs flexible</b>: Fixed for bills, Loans for repayments, Variable for everything that changes.</li>
        <li><b>Understand deltas</b>: Δ is <i>Actual − Plan</i>. Red = <b>Overbudget</b>; Green = <b>Underbudget</b>.</li>
        <li><b>Updates</b>: If a new version ships, you’ll see a small banner — click <b>Refresh</b> to switch instantly.</li>
        <li><b>When in doubt</b>: Open Dashboard → Budget Status to see exactly where differences come from.</li>
        <li><b>Offline & private</b>: Everything stays in your browser. Export a backup before clearing browser data.</li>
      </ul>

      <p className="mt-6 text-xs text-gray-500">Made to be fast, private, and low‑effort. Add what matters, and the rest stays out of your way.</p>
    </div>
  )
}
