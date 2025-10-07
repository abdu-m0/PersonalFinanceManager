import { parseBankSms, buildTransactionFromSms } from "../utils/sms";

describe("parseBankSms", () => {
  it("parses the bank SMS format", () => {
    const message =
      "Transaction from C123 on 12/02/25 at 14:32:10 for MVR150.75 at City Market. Reference No: 98765, Approval Code: 12345.";
    const parsed = parseBankSms(message);
    expect(parsed.accountLabel).toBe("C123");
    expect(parsed.currency).toBe("MVR");
    expect(parsed.amount).toBe(150.75);
    expect(parsed.merchant).toBe("City Market");
    expect(parsed.referenceNo).toBe("98765");
    expect(parsed.approvalCode).toBe("12345");
  });

  it("builds a transaction with overrides", () => {
    const parsed = parseBankSms(
      "Transaction from C000 on 01/01/25 at 00:00:00 for MVR50.00 at Cafe. Reference No: AAA, Approval Code: BBB."
    );
    const tx = buildTransactionFromSms(parsed, { accountId: "acc-1", category: "Dining" });
    expect(tx.type).toBe("expense");
    expect(tx.accountId).toBe("acc-1");
    expect(tx.category).toBe("Dining");
    expect(tx.merchant).toBe("Cafe");
  });
});
