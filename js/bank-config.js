# 銀行帳戶配置

// 請在此設定您的銀行帳戶資訊
// 此資訊將顯示在報名頁面供學員查看

const BANK_ACCOUNT_INFO = {
    bankName: '台灣銀行',
    bankCode: '004',
    branchName: '台北分行',
    accountName: '致福益人學苑懷寧浸信會分校',
    accountNumber: '123-456-789012',
    note: '請務必填寫正確的「轉帳帳號後5碼」以便核對！'
};

// 請勿修改以下程式碼
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BANK_ACCOUNT_INFO;
}
