
export function generateZatcaQrCode(sellerName: string, vatNumber: string, timestamp: string, totalAmount: string, vatAmount: string): string {
    const hexToBuf = (tag: number, value: string) => {
        const valBuf = Buffer.from(value, 'utf8');
        return Buffer.concat([
            Buffer.from([tag]),
            Buffer.from([valBuf.length]),
            valBuf
        ]);
    };

    const qrBuf = Buffer.concat([
        hexToBuf(1, sellerName),
        hexToBuf(2, vatNumber),
        hexToBuf(3, timestamp),
        hexToBuf(4, totalAmount),
        hexToBuf(5, vatAmount)
    ]);

    return qrBuf.toString('base64');
}
