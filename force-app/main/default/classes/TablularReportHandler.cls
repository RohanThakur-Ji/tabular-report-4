public class TablularReportHandler {

    @AuraEnabled(cacheable=true)
    public static Integer totalRecords(){
        try {
            List<Account> accountRecord = [SELECT Id FROM Account];
            return accountRecord.size();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<AccountWrapper> getAccountRecordsWire() {
        try {

            List<AccountWrapper> accountData = new List<AccountWrapper>();

            List<Account> accountRecords = [
                SELECT 
                    Name, Contract_Start_Date_CS__c, Churn_Date__c, Payment_Terms__c, CurrencyIsoCode, Amount__c, Contract_ARR__c, ARR__c 
                FROM Account 
                ORDER BY Contract_Start_Date_CS__c ASC
            ];

            for (Account record : accountRecords) {
                accountData.add(mapFieldsWithWrapperFields(record, true));
            }

            return accountData;

        } catch (Exception exp) {
            throw new AuraException(exp.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<AccountWrapper> getAccountRecords(Integer limitSize, Integer offSet) {
        try {

            List<AccountWrapper> accountData = new List<AccountWrapper>();

            List<Account> accountRecords = [
                SELECT 
                    Name, Contract_Start_Date_CS__c, Churn_Date__c, Payment_Terms__c, CurrencyIsoCode, Amount__c, Contract_ARR__c 
                FROM Account 
                ORDER BY Contract_Start_Date_CS__c ASC
                LIMIT :limitSize
                OFFSET :offSet
            ];

            for (Account record : accountRecords) {
                accountData.add(mapFieldsWithWrapperFields(record, false));
            }

            System.debug(accountData);

            return accountData;

        } catch (Exception exp) {
            throw new AuraException(exp.getMessage());
        }
    }

    @TestVisible
    private static AccountWrapper mapFieldsWithWrapperFields(Account record, Boolean isARR) {

        AccountWrapper accountRecord = new AccountWrapper();

        accountRecord.name = !String.isBlank(record.Name) ? record.Name : '';
        accountRecord.paymentTerm = !String.isBlank(record.Payment_Terms__c) ? record.Payment_Terms__c : '';
        accountRecord.contractStartDate = record.Contract_Start_Date_CS__c != null ? String.valueOf(record.Contract_Start_Date_CS__c) : '0000-00-00';
        accountRecord.amount = record.Amount__c != null ? record.Amount__c : 0.0;
        accountRecord.amountARR = record.Contract_ARR__c != null ? record.Contract_ARR__c : 0.0;
        accountRecord.churnDate = record.Churn_Date__c != null ? String.valueOf(record.Churn_Date__c) : '0000-00-00';
        if (isARR) accountRecord.ARR = record.ARR__c != null ? record.ARR__c : 0.0;

        return accountRecord;

    }

    public class AccountWrapper {
        @AuraEnabled
        public String name;

        @AuraEnabled
        public String paymentTerm;

        @AuraEnabled
        public String currencyCode;

        @AuraEnabled
        public String contractStartDate;

        @AuraEnabled
        public String contractRenewalDate;

        @AuraEnabled
        public String churnDate;

        @AuraEnabled
        public Decimal amount;

        @AuraEnabled 
        public Decimal amountARR;

        @AuraEnabled
        public Decimal ARR;
    }

}