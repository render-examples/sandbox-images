# Fix order quote rounding and rehearse a migration

The order quote endpoint truncates half-cent discounts. Add regression coverage
for order 3 at a 50% discount and use integer half-up rounding. Keep totals exact.

Apply the checked-in priority-column upgrade, prove its default and CHECK
constraint, and run the downgrade. Existing IDs, customers and totals must
survive unchanged. Emit the test results and a unified source patch; do not use external
services or credentials. The supplied recipe demonstrates a deterministic fix.
