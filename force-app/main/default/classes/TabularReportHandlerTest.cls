@isTest
public with sharing class TabularReportHandlerTest {
    @TestSetup
    static void makeData(){

        List<String> paymentTerms = new List<String> {
            'Monthly', 'Bi-Annual', 'Annual', 'Quarterly'
        };

        List<String> currencyIso = new List<String> {
            'USD - U.S. Dollar', 'CAD - Canadian Dollar'
        };

        List<Integer> years = new List<Integer> {
            2018, 2019, 2020, 2021, 2022
        };

        List<Account> accountList = new List<Account>();

        for (Integer i = 1; i <= 300; i++) {
            
            Date startDate = Date.newInstance(years[Integer.valueOf(Math.floor(Math.random() * 5))], Integer.valueOf(Math.floor(Math.random() * (12 - 2) + 1)), Integer.valueOf(Math.floor(Math.random() * (12 - 2) + 1)));
            Date churnDate = Date.newInstance(years[Integer.valueOf(Math.floor(Math.random() * 5))], Integer.valueOf(Math.floor(Math.random() * (12 - 2) + 1)), Integer.valueOf(Math.floor(Math.random() * (12 - 2) + 1)));
            Account temp = new Account();


            temp.Name = 'Account-' + i;
            temp.Currency__c = currencyIso[Integer.valueOf(Math.floor(Math.random() * 2))].split(' ')[0];
            temp.Payment_Terms__c = paymentTerms[Integer.valueOf(Math.floor(Math.random() * 4))];
            temp.Locations__c = Integer.valueOf(Math.floor(Math.random() * (30 - 11) + 10));
            temp.Unit_Price_Audit__c = Integer.valueOf(Math.floor(Math.random() * (1000 - 501) + 500));
            temp.Unit_Price_Daily__c = Integer.valueOf(Math.floor(Math.random() * (1000 - 501) + 500));
            temp.Contract_Start_Date_CS__c = startDate;
            temp.DailyChex_Units__c = Integer.valueOf(Math.floor(Math.random() * 200));
            temp.AuditApp_Units__c = Integer.valueOf(Math.floor(Math.random() * 200));

            if (churnDate.year() > startDate.year() && churnDate.month() > startDate.month()) {
                temp.Churn_Date__c = churnDate;
            }

            accountList.add(temp);

        }

        for (Account record : accountList) {
            System.debug(record);
        }

        INSERT accountList;
    }

    @isTest
    static void getAccountRecordsWireTest() {

        List<TablularReportHandler.AccountWrapper> testData = new List<TablularReportHandler.AccountWrapper>();

        Test.startTest();
            testData = TablularReportHandler.getAccountRecordsWire();
        Test.stopTest();

        System.assert(testData.size() == 300);
    }

    @isTest
    static void getAccountRecordsTest() {

       List<TablularReportHandler.AccountWrapper> testData = new List<TablularReportHandler.AccountWrapper>();

        Test.startTest();
            testData = TablularReportHandler.getAccountRecords(10, 0);
        Test.stopTest();

        System.debug(testData.size() == 10);

    }

    @isTest
    static void getAccountWithStartARRTest() {

        List<TablularReportHandler.AccountWrapper> testData = new List<TablularReportHandler.AccountWrapper>();

        Test.startTest();
            testData = TablularReportHandler.getAccountWithStartARR(10, 0);
        Test.stopTest();

        System.debug(testData.size() == 10);

    }

    @isTest
    static void getTotalRecordsWithExceptionTest() {

        List<Account> accList = new List<Account>();

        for (Integer i = 0; i < 10000; i++) {
            Account acc = new Account(Name = 'Test' + i);
            accList.add(acc);
        }

        INSERT accList;

        Integer totalRecords = 0;

        Test.startTest();
        totalRecords = TablularReportHandler.totalRecords();
        Test.stopTest();

        System.debug(totalRecords == accList.size());

    }

}