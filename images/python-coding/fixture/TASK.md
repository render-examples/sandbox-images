# Fix discount rounding

This synthetic pricing library has a known defect: a half-cent discount result
is rounded down. Preserve integer arithmetic and round half cents up. Add a
regression test for 101 cents discounted by 50 percent (expected: 51 cents),
and test zero/full discounts. Run the baseline first, demonstrate the failing
regression before fixing the implementation, then export the patch and results.

The fixture contains no external repository or user data.
