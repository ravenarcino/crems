type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

export const translations: Translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.properties": "Properties",
    "nav.tenants": "Tenants",
    "nav.payments": "Payments",
    "nav.reports": "Reports",
    "nav.account": "Account",
    "nav.general": "General",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Overview of your commercial real estate management system",
    "dashboard.totalCollected": "Total Collected",
    "dashboard.totalOverdue": "Total Overdue",
    "dashboard.unpaidGoodwill": "Unpaid Goodwill",
    "dashboard.totalProperties": "Total Properties",
    "dashboard.totalTenants": "Total Tenants",
    "dashboard.monthlyRevenue": "Monthly Revenue & Overdue",
    "dashboard.propertyStatus": "Property Status",
    "dashboard.pendingCompliance": "Pending Compliance",
    
    // General Settings
    "general.title": "General",
    "general.appearance": "Appearance",
    "general.theme": "Theme",
    "general.themeDescription": "Choose how the interface looks for you.",
    "general.default": "Default",
    "general.dark": "Dark",
    "general.preferences": "Preferences",
    "general.language": "Language",
    "general.languageDescription": "Display language for the interface",
    "general.save": "Save changes",
    "general.cancel": "Cancel",
    "general.settingsSaved": "Settings saved successfully!",
    
    // Account Page
    "account.title": "Account",
    "account.personalInfo": "Personal information",
    "account.edit": "Edit",
    "account.userId": "User ID",
    "account.fullName": "Full Name",
    "account.email": "Email",
    "account.role": "Role",
    "account.memberSince": "Member since",
    "account.lastUpdated": "Last updated",
    "account.security": "Security",
    "account.password": "Password",
    "account.passwordDescription": "Last changed 3 months ago",
    "account.changePassword": "Change password",
    "account.deleteAccount": "Delete account",
    "account.deleteDescription": "This action is permanent and cannot be undone",
    "account.delete": "Delete",
    
    // Edit Account Details
    "account.editTitle": "Edit Details",
    "account.editDescription": "Update your account details.",
    "account.saveChanges": "Save Changes",
    "account.close": "Close",
    
    // Change Password
    "account.changePasswordTitle": "Change Password",
    "account.changePasswordDescription": "Enter your new password below.",
    "account.newPassword": "New Password",
    "account.save": "Save",
    
    // Delete Account Dialog
    "account.deleteAccountTitle": "Delete Account",
    "account.deleteAccountDescription": "Are you sure you want to delete your account? This action cannot be undone.",
    
    // Buttons
    "button.addTenant": "Add Tenant",
    "button.filterDelinquent": "Filter Delinquent",
    "button.addPayment": "Add Payment",
    "button.addProperty": "Add Property",
    "button.downloadExcel": "Download Excel",
    "button.createProperty": "Create Property",
    "button.cancel": "Cancel",
    "button.editProperty": "Edit Property",
    "button.deleteProperty": "Delete Property",
    "button.updateProperty": "Update Property",
    "button.delete": "Delete",
    
    // Tables
    "table.ticketId": "Ticket ID",
    "table.tenant": "Tenant",
    "table.month": "Month",
    "table.year": "Year",
    "table.paymentType": "Payment Type",
    "table.amount": "Amount",
    "table.status": "Status",
    "table.paidDate": "Paid Date",
    "table.action": "Action",
    "table.noPayments": "No payments found",
    "table.loading": "Loading...",
    
    // Payments
    "payments.title": "Payments Management",
    "payments.subtitle": "Manage payment information, tenant payments, and payment status.",
    "payments.view": "View",
    "payments.edit": "Edit",
    "payments.delete": "Delete",
    "payments.monthlyRent": "Monthly Rent",
    "payments.goodwillFee": "Goodwill Fee",
    "payments.paid": "Paid",
    "payments.overdue": "Overdue",
    "payments.partial": "Partial",
    "payments.addTitle": "Select Payment Type",
    "payments.addDescription": "Choose which type of payment you want to add.",
    
    // Properties
    "properties.title": "Properties Management",
    "properties.subtitle": "Manage commercial spaces, rental rates, goodwill fees, and occupancy status.",
    "properties.view": "View",
    "properties.edit": "Edit",
    "properties.delete": "Delete",
    "properties.propertyName": "Property Name",
    "properties.building": "Building",
    "properties.areaSize": "Area Size",
    "properties.monthlyRent": "Monthly Rent",
    "properties.goodwillFee": "Goodwill Fee",
    "properties.addNew": "Add New Property",
    "properties.detail": "Property Detail",
    "properties.editDetail": "Edit Property Detail",
    
    // Tenants
    "tenants.title": "Tenants Management",
    "tenants.subtitle": "Manage tenant information, property assignments, and payment status.",
    "tenants.view": "View",
    "tenants.edit": "Edit",
    "tenants.delete": "Delete",
    "tenants.tenantId": "Tenant ID",
    "tenants.name": "Name",
    "tenants.phone": "Phone",
    "tenants.totalMonthlyRent": "Total Monthly Rent",
    "tenants.totalGoodwillFee": "Total Goodwill Fee",
    
    // Reports
    "reports.title": "Reports dashboard",
    "reports.subtitle": "Analyze payment trends and property performance",
    "reports.collected": "Collected",
    "reports.overdue": "Overdue",
    "reports.occupied": "Occupied",
    "reports.available": "Available",
    "reports.paid": "Paid",
    "reports.unpaid": "Unpaid",
    "reports.delinquent": "Delinquent",
    "reports.monthlyRevenue": "Monthly revenue",
    "reports.propertyStatus": "Property status",
    "reports.tenantStatus": "Tenant status",
    "reports.selectYear": "Select Year",
    "reports.selectMonth": "Select Month",
    "reports.allMonths": "All Months",
    
    // Nav User
    "navUser.account": "Account",
    "navUser.general": "General",
    "navUser.logout": "Log out",
    
    // Toast
    "toast.loading": "Loading...",
    "toast.success": "Success!",
    "toast.error": "Error!",
    "toast.updating": "Updating...",
    "toast.deleting": "Deleting...",
    "toast.saving": "Saving...",
    "toast.creating": "Creating...",
    
    // Alert Dialog
    "alert.deleteTitle": "Delete this item?",
    "alert.deleteDescription": "This action cannot be undone. This will permanently delete this record and remove it from your system.",
  },
  
  fil: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.properties": "Mga Ari-arian",
    "nav.tenants": "Mga Nangungupahan",
    "nav.payments": "Mga Bayad",
    "nav.reports": "Mga Ulat",
    "nav.account": "Account",
    "nav.general": "Pangkalahatan",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Pangkalahatang-ideya ng iyong sistema ng pamamahala ng komersyal na real estate",
    "dashboard.totalCollected": "Kabuuang Nakolekta",
    "dashboard.totalOverdue": "Kabuuang Nalalate",
    "dashboard.unpaidGoodwill": "Hindi Nabayarang Goodwill",
    "dashboard.totalProperties": "Kabuuang Ari-arian",
    "dashboard.totalTenants": "Kabuuang Nangungupahan",
    "dashboard.monthlyRevenue": "Buwanang Kita at Nalalate",
    "dashboard.propertyStatus": "Katayuan ng Ari-arian",
    "dashboard.pendingCompliance": "Nakabinbing Kumpiyansa",
    
    // General Settings
    "general.title": "Pangkalahatan",
    "general.appearance": "Hitsura",
    "general.theme": "Tema",
    "general.themeDescription": "Piliin kung paano ang hitsura ng interface para sa iyo.",
    "general.default": "Default",
    "general.dark": "Madilim",
    "general.preferences": "Mga Kagustuhan",
    "general.language": "Wika",
    "general.languageDescription": "Wika ng display para sa interface",
    "general.save": "I-save ang mga pagbabago",
    "general.cancel": "Kanselahin",
    "general.settingsSaved": "Matagumpay na nai-save ang mga setting!",
    
    // Account Page
    "account.title": "Account",
    "account.personalInfo": "Personal na impormasyon",
    "account.edit": "I-edit",
    "account.userId": "User ID",
    "account.fullName": "Buong Pangalan",
    "account.email": "Email",
    "account.role": "Tungkulin",
    "account.memberSince": "Miyembro mula noong",
    "account.lastUpdated": "Huling na-update",
    "account.security": "Seguridad",
    "account.password": "Password",
    "account.passwordDescription": "Huling binago 3 buwan na ang nakararaan",
    "account.changePassword": "Baguhin ang password",
    "account.deleteAccount": "Tanggalin ang account",
    "account.deleteDescription": "Ang pagkilos na ito ay permanente at hindi maaaring bawiin",
    "account.delete": "Tanggalin",
    
    // Buttons
    "button.addTenant": "Magdagdag ng Nangungupahan",
    "button.filterDelinquent": "I-filter ang Nalalate",
    "button.addPayment": "Magdagdag ng Bayad",
    "button.addProperty": "Magdagdag ng Ari-arian",
    "button.downloadExcel": "I-download ang Excel",
    
    // Nav User
    "navUser.account": "Account",
    "navUser.general": "Pangkalahatan",
    "navUser.logout": "Mag-log out",
  },
  
  ja: {
    // Navigation
    "nav.dashboard": "ダッシュボード",
    "nav.properties": "物件",
    "nav.tenants": "テナント",
    "nav.payments": "支払い",
    "nav.reports": "レポート",
    "nav.account": "アカウント",
    "nav.general": "一般",
    
    // Dashboard
    "dashboard.title": "ダッシュボード",
    "dashboard.subtitle": "商業用不動産管理システムの概要",
    "dashboard.totalCollected": "総収集額",
    "dashboard.totalOverdue": "総延滞額",
    "dashboard.unpaidGoodwill": "未払いの営業権",
    "dashboard.totalProperties": "総物件数",
    "dashboard.totalTenants": "総テナント数",
    "dashboard.monthlyRevenue": "月間収入と延滞",
    "dashboard.propertyStatus": "物件ステータス",
    "dashboard.pendingCompliance": "保留中のコンプライアンス",
    
    // General Settings
    "general.title": "一般",
    "general.appearance": "外観",
    "general.theme": "テーマ",
    "general.themeDescription": "インターフェースの表示方法を選択してください。",
    "general.default": "デフォルト",
    "general.dark": "ダーク",
    "general.preferences": "設定",
    "general.language": "言語",
    "general.languageDescription": "インターフェースの表示言語",
    "general.save": "変更を保存",
    "general.cancel": "キャンセル",
    "general.settingsSaved": "設定が正常に保存されました！",
    
    // Account Page
    "account.title": "アカウント",
    "account.personalInfo": "個人情報",
    "account.edit": "編集",
    "account.userId": "ユーザーID",
    "account.fullName": "氏名",
    "account.email": "メール",
    "account.role": "役割",
    "account.memberSince": "メンバーになった日",
    "account.lastUpdated": "最終更新日",
    "account.security": "セキュリティ",
    "account.password": "パスワード",
    "account.passwordDescription": "最後に変更されたのは3か月前",
    "account.changePassword": "パスワードを変更",
    "account.deleteAccount": "アカウントを削除",
    "account.deleteDescription": "この操作は永久的で取り消すことはできません",
    "account.delete": "削除",
    
    // Buttons
    "button.addTenant": "テナントを追加",
    "button.filterDelinquent": "延滞をフィルター",
    "button.addPayment": "支払いを追加",
    "button.addProperty": "物件を追加",
    "button.downloadExcel": "Excelをダウンロード",
    
    // Nav User
    "navUser.account": "アカウント",
    "navUser.general": "一般",
    "navUser.logout": "ログアウト",
  }
};
