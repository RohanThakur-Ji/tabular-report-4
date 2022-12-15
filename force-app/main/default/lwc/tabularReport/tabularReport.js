import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAccountRecords from '@salesforce/apex/TablularReportHandler.getAccountRecords';
import getAccountRecordsWired from '@salesforce/apex/TablularReportHandler.getAccountRecordsWire';
import totalRecords from '@salesforce/apex/TablularReportHandler.totalRecords';


const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default class TabularReport extends LightningElement {

    @track monthOptions = [
        { label: 'Jan', value: 'Jan' },
        { label: 'Feb', value: 'Feb' },
        { label: 'Mar', value: 'Mar' },
        { label: 'Apr', value: 'Apr' },
        { label: 'May', value: 'May' },
        { label: 'Jun', value: 'Jun' },
        { label: 'Jul', value: 'Jul' },
        { label: 'Aug', value: 'Aug' },
        { label: 'Sep', value: 'Sep' },
        { label: 'Oct', value: 'Oct' },
        { label: 'Nov', value: 'Nov' },
        { label: 'Dec', value: 'Dec' }
    ];                                          // list of months options for combobox.

    @track yearOptions = [];                    // list of years options for combobox.
    @track yearList = [];                       // payment terms year list that need to shown in combobox.
    @track mrrDatalist = [];                    // contract dataset for MRR table.
    @track dataListContainer = [];              // primary dataset list.
    @track columnsList = [];                    // column dataset for MRR table.
    @track columnsContainer = [];               // primary column set list.
    @track monthlyDataList = [];                // filtered dataset of contract with monthly payment term.
    @track biAnnualDataList = [];               // filtered dataset of contract with bi-annual payment term.
    @track annualDataList = [];                 // filtered dataset of contract with annual payment term.
    @track quarterlyDataList = [];              // filtered dataset of contract with quarterly payment term.
    @track aggregateDataList = [];              // dataset of aggregated data (Total & Average) for cash flow table.
    @track aggregateColumnsList = [];           // columns dataset for cash flow table.
    @track retrievedYears = [];                 // all years

    @track efficientlyCalculatedMonthlyCashFlowData = [];
    @track efficientlyCalculatedMonthlySum = {};
    @track efficientlyCalculatedMonthlyAverage = {};

    @track debugObj = {};

    wiredDataError;                             // stores error of wire call.
    mrrDataError;                               // stores error of mrr method in imperative call.
    arrDataError;                               // stores error of arr method in imperative call.

    totalAccountRecords;                        // stores total record count form loadInit() method.

    startYearComboboxValue = '';                // stores start year combobox value.
    startMonthComboboxValue = '';               // stores start month input value.

    endYearComboboxValue = '';                  // stores end year combobox value.
    endMonthComboboxValue = '';                 // stores end month input value.

    currentFirstIndex = 0;                      // start month slicing flag.
    currentLastIndex = 12;                      // end month slicing flag.

    mrrOffset = 0;                              // lazy loading off-set value passed in imperative call to get off setted data for MRR report.
    mrrRowLimit = 10;                           // lazy loading row-limit value passed in imperative call to get row limited data for MRR report.

    startMonthAndYearHelpText = '';             // start month help text value.
    endMonthAndYearHelpText = '';               // end month help text value.

    totalCompletePages;                         // for handling next-previous button.
    currentPageNumberIndex = 0;                 // for handling next-previous button.

    disableLeft = true;                         // flag var
    disableRight = false;                       // flag var
    disableReset = true;                        // flag var
    disableCombox = false;                      // flag var

    totalAccountRecords = 0;                    // total account records count
    mrrInfiniteLoading = true;                  // to enable infinite loading on MRR datatable.

    showSpinner = true;                         // spinner flag
    showDatatable = false;                      // datatable flag

    notUpdateColumn = true;

    // wire call for initial aggreation of data [Total cash flow, Average cash flow, ARR]
    @wire(getAccountRecordsWired)
    accountRecords({ error, data }) {

        if (data) {

            this.wiredDataError = undefined;

            const contractStartMonthAndYear = this.formatDate(data[0].contractStartDate);
            this.columnsContainer = this.setLabels(contractStartMonthAndYear);
            this.totalCompletePages = Math.floor(this.columnsContainer.length / 12);
            this.columnsList = this.columnsContainer.slice(this.currentfirstIndex, this.currentLastIndex);
            this.aggregateColumnsList = [...this.columnsList];
            this.appendNameField();
            this.appendMRRNameField();
            this.getAllYears();

            console.log(JSON.stringify(this.totalCompletePages));

            let startMonthYearRangeInfo = this.columnsContainer[0]["fieldName"];
            let endMonthYearRangeInfo = this.columnsContainer[this.columnsContainer.length - 1]["fieldName"];
            this.startMonthAndYearHelpText = `\u2022 Valid start month for ${startMonthYearRangeInfo.split('-')[1]} is ${startMonthYearRangeInfo.split('-')[0]}.`;
            this.endMonthAndYearHelpText = `\u2022 Valid end month for ${endMonthYearRangeInfo.split('-')[1]} is ${endMonthYearRangeInfo.split('-')[0]}.`;

            for (let item of data) {


                if (item.paymentTerm === 'Annual') {
                    const amount = item.amountARR;
                    this.dataListContainer.push(this.getDataListLabelsForAnnually(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate, item.amountARR));
                }

                if (item.paymentTerm === 'Bi-Annual') {
                    const amount = item.amountARR / 2;
                    this.dataListContainer.push(this.getDataListLabelsForBiAnnually(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate, item.amountARR));
                }

                if (item.paymentTerm === 'Quarterly') {
                    const amount = item.amountARR / 4;
                    this.dataListContainer.push(this.getDataListLabelsForQuarterly(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate, item.amountARR));
                }

                if (item.paymentTerm === 'Monthly') {
                    const amount = item.amountARR / 12;
                    this.dataListContainer.push(this.getDataListLabelsForMonthly(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate, item.amountARR));
                }

            }

            // this.calculateTotalSumByMonth();
            this.efficientSumOfMonth();
            // this.calculateAverageByMonth();
            this.efficientAverageOfMonth();
            // this.calculateARR();
            this.efficientARR();

            this.showSpinner = false;

        } else if (error) {
            this.dataListContainer = undefined;
            this.wiredDataError = error;
        }

    }

    connectedCallback() {
        this.loadInit();
        this.loadMRRData();
    }

    // methods count total number of records
    loadInit() {
        return totalRecords()
            .then((data) => {
                this.totalAccountRecords = data;
            })
            .catch((error) => {
                throw error;
            })
    }

    // initial data loading method for MRR datatable.
    loadMRRData() {
        return getAccountRecords({ limitSize: this.mrrRowLimit, offSet: this.mrrOffset })
            .then(data => {
                this.mrrDataError = undefined;

                const updatedData = [];

                for (let item of data) {

                    if (item.paymentTerm === 'Annual') {
                        const amount = item.amountARR;
                        updatedData.push(this.getDataListLabelsForAnnually(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate));
                    }


                    if (item.paymentTerm === 'Bi-Annual') {
                        const amount = item.amountARR / 2;
                        updatedData.push(this.getDataListLabelsForBiAnnually(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate));
                    }

                    if (item.paymentTerm === 'Quarterly') {
                        const amount = item.amountARR / 4;
                        updatedData.push(this.getDataListLabelsForQuarterly(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate));
                    }

                    if (item.paymentTerm === 'Monthly') {
                        const amount = item.amountARR / 12;
                        updatedData.push(this.getDataListLabelsForMonthly(item.name, amount.toFixed(2), item.contractStartDate, item.churnDate));
                    }
                }

                this.mrrDatalist = [...this.mrrDatalist, ...updatedData];

            })
            .catch(error => {
                this.mrrDataError = error;
                this.mrrDatalist = undefined;
            })
    }

    // lazy loading method for loading more MRR data for datatable.
    loadMoreMRRData(event) {

        console.log("LoadMoreMRRData");

        const tempData = this.mrrDatalist;
        const { target } = event;
        target.isLoading = true;

        this.mrrOffset = this.mrrOffset + this.mrrRowLimit;

        const localRowOffSet = +JSON.stringify(this.mrrOffset);
        const localRecordsCount = +JSON.stringify(this.totalAccountRecords);


        if (localRowOffSet >= localRecordsCount) {

            this.mrrInfiniteLoading = false;
            target.isLoading = false;

        } else {

            this.loadMRRData()
                .then(() => {
                    target.isLoading = false
                });
        }


    }

    // get all years in which contract's payment terms are available
    getAllYears() {

        let result = [];

        for (let column of this.columnsContainer) {
            this.retrievedYears.push(column.fieldName);
            result.push(column.fieldName.split('-')[1]);
        }

        const unique = new Set(result);
        result = [...unique];

        this.yearOptions = result.map((ele) => { return { label: ele, value: ele }; });
        this.yearList = [...result];

    }

    // month difference utility method
    monthDiff(d1, d2) {

        let mont;

        mont = (d2.getFullYear() - d1.getFullYear()) * 12;

        mont -= d1.getMonth();

        mont += d2.getMonth();

        return mont;
    }

    // format the column heading ex: Jan-2021
    formatDate(rawDate) {
        const tempDate = new Date(rawDate);
        return `${months[tempDate.getMonth()]}-${tempDate.getFullYear()}`;
    }

    // appends the name column to main column list
    appendNameField() {
        this.columnsList.unshift({
            label: '',
            fieldName: 'name'
        });
    }

    // appends the name column.
    appendMRRNameField() {
        this.aggregateColumnsList.unshift({
            label: 'Monthly',
            fieldName: 'name'
        });
    }

    // set labels of data row for columns
    setLabels(firstDate) {

        const labels = [];
        const todayDate = new Date();
        const startDate = new Date(firstDate);

        const result = this.monthDiff(startDate, todayDate);

        for (let i = 0; i < result; i++) {

            const tempStartDate = new Date(startDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            labels.push({
                label: this.formatDate(tempDate),
                fieldName: this.formatDate(tempDate),
                type: 'currency',
                cellAttributes: {
                    alignment: "center"
                },
                typeAttributes: {
                    currencyCode: "CAD",
                    minimumFractionDigits: "0",
                    maximumFractionDigits: "2"
                }
            });

        }

        return labels;
    }

    // set labels to arr datalist.
    getArrDataLabels(name, arrAmount, startDate, endDate) {

        const tStartDate = new Date(startDate);
        const tEndDate = endDate === '0000-00-00' ? new Date() : new Date(endDate);

        const monthDifference = this.monthDiff(tStartDate, tEndDate);

        const result = {
            'name': name
        }

        for (let i = 0; i < monthDifference; i++) {

            const tempStartDate = new Date(startDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            if (
                tempDate.getDate() === tStartDate.getDate() &&
                tempDate.getMonth() === tStartDate.getMonth() &&
                tempDate.getFullYear() !== tStartDate.getFullYear()
            ) {
                result[this.formatDate(tempDate)] = arrAmount;
            }
        }

        return result;
    }

    // set label of monthly payment term[month-year] and value to datatable data variable.
    getDataListLabelsForMonthly(name, value, startDate, endDate, amount) {

        const tStartDate = new Date(startDate);
        const tEndDate = endDate == '0000-00-00' ? new Date() : new Date(endDate);

        const monthDifference = this.monthDiff(tStartDate, tEndDate);
        tStartDate.setDate(1);

        const result = {
            'name': name
        };
        if (amount !== undefined) result["amount"] = amount;

        for (let i = 0; i < monthDifference; i++) {

            const tempStartDate = new Date(tStartDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            result[this.formatDate(tempDate)] = value;
        }

        return result;

    }

    // set label of bi-annually payment term[month-year] and value to datatable data variable
    getDataListLabelsForBiAnnually(name, value, startDate, endDate, amount) {

        const tStartDate = new Date(startDate);
        const tEndDate = endDate == '0000-00-00' ? new Date() : new Date(endDate);

        const monthDifference = this.monthDiff(tStartDate, tEndDate);
        tStartDate.setDate(1);

        const result = {
            'name': name
        };
        if (amount !== undefined) result["amount"] = amount;

        for (let i = 0; i < monthDifference; i += 6) {

            const tempStartDate = new Date(tStartDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            result[this.formatDate(tempDate)] = value;
        }

        return result;
    }

    // set label of annually payment term[month-year] and value to datatable data variable
    getDataListLabelsForAnnually(name, value, startDate, endDate, amount) {

        const tStartDate = new Date(startDate);
        const tEndDate = endDate == '0000-00-00' ? new Date() : new Date(endDate);

        const monthDifference = this.monthDiff(tStartDate, tEndDate);
        tStartDate.setDate(1);

        const result = {
            'name': name
        };
        if (amount !== undefined) result["amount"] = amount;

        for (let i = 0; i < monthDifference; i += 12) {

            const tempStartDate = new Date(tStartDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            result[this.formatDate(tempDate)] = value;
        }

        return result;
    }

    // set label of quarterly payment term[month-year] and value to datatable data variable
    getDataListLabelsForQuarterly(name, value, startDate, endDate, amount) {

        const tStartDate = new Date(startDate);
        const tEndDate = endDate == '0000-00-00' ? new Date() : new Date(endDate);

        const monthDifference = this.monthDiff(tStartDate, tEndDate);
        tStartDate.setDate(1);

        const result = {
            'name': name
        };
        if (amount !== undefined) result["amount"] = amount;

        for (let i = 0; i < monthDifference; i += 3) {


            const tempStartDate = new Date(tStartDate);
            const tempDate = new Date(tempStartDate.setMonth(tempStartDate.getMonth() + i));

            result[this.formatDate(tempDate)] = value;
        }

        return result;
    }

    // aggregate sum of payment term each month for total cash flow row in monthly cash flow report.
    // calculateTotalSumByMonth() {

    //     const tempObj = {};
    //     let flag = 0;

    //     try {
    //         for (let column of this.columnsContainer) {

    //             flag++;
    //             let total = 0;

    //             for (let data of this.dataListContainer) {
    //                 if (data.hasOwnProperty(column.fieldName)) {
    //                     total += +data[column.fieldName];
    //                 }
    //             }

    //             if (flag === this.columnsContainer.length - 1) {
    //                 tempObj["name"] = "Total Cash Flow";
    //             }

    //             if (total > 0) {
    //                 tempObj[column.fieldName] = total;
    //             }
    //         }
    //     } catch (error) {
    //         throw new error;
    //     }

    //     this.aggregateDataList.push({ ...tempObj });
    // }

    efficientSumOfMonth() {

        const duplicateMainData = JSON.parse(JSON.stringify(this.dataListContainer));
        const result = {};
        const tempMonthAndYearWithAmount = [];
        let flag = 0;

        for (let column of this.columnsContainer) {
            result[column["fieldName"]] = 0;
        }

        for (let data of duplicateMainData) {

            delete data["name"];
            delete data["amount"];

            Object.entries(data).map(([key, value]) => {
                tempMonthAndYearWithAmount.push(`${key}=${value}`);
            });
        }


        for (let data of tempMonthAndYearWithAmount) {
            flag++;

            const key = data.split('=')[0];
            const value = +data.split('=')[1];

            if (result.hasOwnProperty(key)) {
                let tempData = result[key];
                tempData += value;
                result[key] = +tempData.toFixed(2);
            }

            if (flag === tempMonthAndYearWithAmount.length - 1) {
                result["name"] = "Total Cash Flow";
            }
        }

        this.efficientlyCalculatedMonthlySum = { ...result };
        this.efficientlyCalculatedMonthlyCashFlowData.push({ ...result });
        this.aggregateDataList.push({ ...result });

    }

    efficientAverageOfMonth() {

        const result = {};
        const tempMonthAndYearWithAmount = [];

        const duplicateMainData = JSON.parse(JSON.stringify(this.dataListContainer));
        const duplicateMonthlySum = JSON.parse(JSON.stringify(this.efficientlyCalculatedMonthlySum));

        let flag = 0;

        for (let column of this.columnsContainer) {
            result[column["fieldName"]] = 0;
        }

        for (let data of duplicateMainData) {

            delete data["name"];
            delete data["amount"];

            Object.keys(data).map((key) => {
                tempMonthAndYearWithAmount.push(`${key}`);
            });
        }

        tempMonthAndYearWithAmount.forEach((ele) => {
            result[ele] = (result[ele] || 0) + 1;
        });

        for (let key of Object.keys(result)) {
            flag++;
            if (duplicateMonthlySum.hasOwnProperty(key)) {
                const totalAmount = duplicateMonthlySum[key];
                const totalContracts = result[key];
                const average = (totalAmount / totalContracts);
                result[key] = +average.toFixed(2);
            }

            if (flag == Object.keys(result).length - 1) {
                result["name"] = "Average Cash Flow";
            }
        }

        this.efficientlyCalculatedMonthlyAverage = { ...result };
        this.efficientlyCalculatedMonthlyCashFlowData.push({ ...result });
        this.aggregateDataList.push({ ...result });

        // console.log(JSON.stringify(this.efficientlyCalculatedMonthlyAverage, null, 2));
        // console.log(JSON.stringify(this.efficientlyCalculatedMonthlyCashFlowData, null, 2));
    }

    efficientARR() {

        let total = 0;
        let previousMonth = 0;
        let currentAmount = 0;
        let currentContact = '';
        let passContracts = [];

        const result = {};
        const duplicateMainData = JSON.parse(JSON.stringify(this.dataListContainer));

        this.columnsContainer.forEach((ele) => {
            result[ele["fieldName"]] = 0;
        });

        console.log(Object.entries(duplicateMainData[0])[0], Object.entries(duplicateMainData[0])[1], Object.entries(duplicateMainData[0])[2]);

        duplicateMainData.forEach((data) => {

            const [nameKey, nameValue] = Object.entries(data)[0];
            const [amountKey, amountValue] = Object.entries(data)[1];
            const [monthAndYearKey, monthAndYearValue] = Object.entries(data)[2];

            if (result.hasOwnProperty(monthAndYearKey)) {

                let contract = nameValue + '=' + amountValue;

                if (contract !== currentContact && !passContracts.includes(contract)) {
                    passContracts.push(contract);
                    currentContact = contract;
                    currentAmount = +amountValue.toFixed(2);
                    total = currentAmount + previousMonth;
                }
                previousMonth = total;

                result[monthAndYearKey] = +total.toFixed(2);
            }
        });

        const monthYearValuesWithZero = Object.entries(result);

        for (let i = 0; i < monthYearValuesWithZero.length; i++) {
            if (monthYearValuesWithZero[i][1] === 0) {
                monthYearValuesWithZero[i][1] = monthYearValuesWithZero[i - 1][1];
                result[monthYearValuesWithZero[i][0]] = monthYearValuesWithZero[i][1];
            }

            if (i === monthYearValuesWithZero.length - 1) {
                result["name"] = "ARR";
            }
        }

        this.aggregateDataList.push({ ...result });
        // console.log(JSON.stringify(monthYearValuesWithZero));
        // console.log(JSON.stringify(result, null, 2));

    }

    // aggregate sum of contract arr each month for ARR row in monthly cash flow report.
    // calculateARR() {

    //     const tempObj = {};
    //     let flag = 0;
    //     let previousMonth = 0;
    //     let total = 0;
    //     let currentAmount = 0;
    //     let currentContract = '';
    //     let passContracts = [];

    //     try {
    //         for (let column of this.columnsContainer) {

    //             flag++;

    //             for (let data of this.dataListContainer) {

    //                 if (data.hasOwnProperty(column.fieldName)) {

    //                     let contract = data["name"] + '-' + data["amount"];

    //                     if (contract !== currentContract && !passContracts.includes(contract)) {
    //                         passContracts.push(contract);
    //                         currentAmount = +data["amount"];
    //                         currentContract = contract;
    //                         total = currentAmount + previousMonth;
    //                     }

    //                     previousMonth = total;
    //                 }
    //             }


    //             if (flag === this.columnsContainer.length - 1) {
    //                 tempObj["name"] = "ARR";
    //             }

    //             if (total > 0) {
    //                 tempObj[column.fieldName] = total;
    //             }
    //         }
    //     } catch (error) {
    //         console.error(error);
    //     }

    //     this.aggregateDataList.push({ ...tempObj });

    // }

    // aggregate average of payment term each month for average row in monthly cash flow report.
    // calculateAverageByMonth() {

    //     let flag = 0;
    //     const tempObj = {};
    //     const debug = {};

    //     for (let column of this.columnsContainer) {

    //         flag++;
    //         let total = 0;
    //         let counter = 0;

    //         for (let data of this.dataListContainer) {
    //             if (data.hasOwnProperty(column.fieldName)) {
    //                 total += +data[column.fieldName];
    //                 counter++;
    //             }
    //         }

    //         debug[column.fieldName] = counter;
    //         tempObj[column.fieldName] = total / counter;

    //         if (flag === this.columnsContainer.length - 1) {
    //             tempObj["name"] = "Average Cash Flow";
    //         }
    //     }

    //     this.aggregateDataList.push({ ...tempObj });
    //     this.debugObj = { ...debug };
    // }

    // previous button handler
    handlePreviousYears() {

        this.showSpinner = true;

        const timeout = setTimeout(() => {

            this.columnsList.shift();

            if (this.currentFirstIndex > 0) {

                this.currentFirstIndex -= 12;
                this.currentLastIndex -= 12;

                if (this.currentPageNumberIndex >= 0 && --this.currentPageNumberIndex == 0) {
                    this.disableLeft = true;
                }

                if (this.totalCompletePages != this.currentPageNumberIndex) {
                    this.disableRight = false;
                }
            }

            this.columnsList = this.columnsContainer.slice(this.currentFirstIndex, this.currentLastIndex);
            this.aggregateColumnsList = [...this.columnsList];
            this.appendNameField();
            this.appendMRRNameField();
            this.showSpinner = false;

        }, 1000);

        if (timeout["_idleTimeout"] === 1000) {
            clearTimeout(timeout);
        }

    }

    // next button handler
    handleNextYears() {

        this.showSpinner = true;

        const timeout = setTimeout(() => {
            this.columnsList.shift();

            if (this.currentFirstIndex >= 0) {

                this.currentFirstIndex += 12;
                this.currentLastIndex += 12;

                this.disableLeft = false;
                this.currentPageNumberIndex++;

                if (this.currentPageNumberIndex == this.totalCompletePages) {
                    this.disableRight = true;
                }

            }

            this.columnsList = this.columnsContainer.slice(this.currentFirstIndex, this.currentLastIndex);
            this.aggregateColumnsList = [...this.columnsList];
            this.appendNameField();
            this.appendMRRNameField();
            this.showSpinner = false;

        }, 1000);

        if (timeout["_idleTimeout"] === 1000) {
            clearTimeout(timeout);
        }

    }

    // handles start month combobox
    handleStartMonthPicklist(event) {
        this.startMonthComboboxValue = event.detail.value;
    }

    // handles start year combobox
    handleStartYearPicklist(event) {
        this.startYearComboboxValue = event.detail.value;
    }

    // handle end month combobox
    handleEndMonthPicklist(event) {
        this.endMonthComboboxValue = event.detail.value;
    }

    // handle end year combobox
    handleEndYearPicklist(event) {
        this.endYearComboboxValue = event.detail.value;
    }

    // handle get data
    handleGetDataPicklist() {

        const startMonthAndYear = this.startMonthComboboxValue + '-' + this.startYearComboboxValue;
        const endMonthAndYear = this.endMonthComboboxValue + '-' + this.endYearComboboxValue;

        const startMonthAndYearIndex = this.retrievedYears.indexOf(startMonthAndYear);
        const endMonthAndYearIndex = this.retrievedYears.indexOf(endMonthAndYear);

        if (endMonthAndYearIndex - startMonthAndYearIndex < 0 || endMonthAndYearIndex - startMonthAndYearIndex > 11 || endMonthAndYearIndex < 0 || startMonthAndYearIndex < 0) {

            let lowerRange = endMonthAndYearIndex - startMonthAndYearIndex < 0 ? "\u2022 End year must be greater than start year." : '';
            let greaterRange = endMonthAndYearIndex - startMonthAndYearIndex > 11 ? "\u2022 Month count must be between 1-12 months." : '';
            let endMonthAndYearError = '';
            let startMonthAndYearError = '';
            let noEndStartError = '';

            if (endMonthAndYearIndex < 0 && startMonthAndYearIndex < 0) {
                noEndStartError = "\u2022 Please select valid start and end months.";
            } else if (startMonthAndYearIndex < 0) {
                startMonthAndYearError = "\u2022 Please select valid start month.";
            } else if (endMonthAndYearIndex < 0) {
                endMonthAndYearError = "\u2022 Please select valid end month."
            }

            const errorEvent = new ShowToastEvent({
                title: "Errors!",
                message: `${lowerRange} ${greaterRange} ${startMonthAndYearError} ${endMonthAndYearError} ${noEndStartError}`,
                variant: 'error',
                mode: 'dismissable'
            });


            this.dispatchEvent(errorEvent);
        } else {

            this.showSpinner = true;
            const timeout = setTimeout(() => {

                this.columnsList = this.columnsContainer.slice(startMonthAndYearIndex, endMonthAndYearIndex + 1);
                this.aggregateColumnsList = [...this.columnsList];
                this.appendNameField();
                this.appendMRRNameField();

                this.disableCombox = true;
                this.disableLeft = true;
                this.disableRight = true;
                this.disableReset = false;
                this.showSpinner = false;

            }, 1000);

            if (timeout["_idleTimeout"] === 1000) {
                clearTimeout(timeout);
            }
        }

    }

    // handle reset button
    handleResetPicklist() {

        this.showSpinner = true;

        const timeout = setTimeout(() => {

            this.startMonthComboboxValue = '';
            this.startYearComboboxValue = '';
            this.endMonthComboboxValue = '';
            this.endYearComboboxValue = '';

            this.currentFirstIndex = 0;
            this.currentLastIndex = 11;

            this.disableRight = false;
            this.disableLeft = true;
            this.disableCombox = false;
            this.disableReset = true;

            this.columnsList = this.columnsContainer.slice(this.currentFirstIndex, this.currentLastIndex + 1);
            this.aggregateColumnsList = [...this.columnsList];
            this.appendNameField();
            this.appendMRRNameField();

            this.showSpinner = false;

        }, 1000);

        if (timeout["_idleTimeout"] === 1000) {
            clearTimeout(timeout);
        }

    }
}

