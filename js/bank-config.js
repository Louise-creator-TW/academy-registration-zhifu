/**
 * 銀行帳戶配置
 */
const BANK_ACCOUNT_INFO = {
    bankName: '台灣銀行',
    bankCode: '004',
    branchName: '台北分行',
    accountName: '致福益人學苑懷寧浸信會分校',
    accountNumber: '123-456-789012', // 請確認這裡改成你的實際帳號
    note: '請務必填寫正確的「轉帳帳號後5碼」以便核對！',
    
    getDisplayInfo() {
        return {
            details: [
                { label: '銀行名稱', value: this.bankName },
                { label: '銀行代碼', value: this.bankCode },
                { label: '分行名稱', value: this.branchName },
                { label: '戶名', value: this.accountName },
                { label: '帳號', value: this.accountNumber }
            ],
            notes: [
                this.note,
                '轉帳後請保留交易明細，以便查詢',
                '匯款完成後系統會自動通知學苑'
            ]
        };
    }
};

// 確保可以被全域存取
if (typeof window !== 'undefined') {
    window.BANK_ACCOUNT_INFO = BANK_ACCOUNT_INFO;
}