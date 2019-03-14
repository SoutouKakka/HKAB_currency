'use strict';

const _ = require('lodash');
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('request-promise');

async function queryCurrency(toCurrency, date) {
	// Initial request parameters
	const requestParams = {
		url: 'https://www.hkab.org.hk/ExchangeRateDisplayAction.do',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			// disguise
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
		}
	};
	// if user input date, query currency of that date
	if (date) {
		validateDate(date); // validate the input date from user
		const { day, month, year } = date;
		_.set(requestParams, 'form.rateDay', day);
		_.set(requestParams, 'form.rateMonth', month);
		_.set(requestParams, 'form.rateYear', year);
	}
	// request HKAB site
	const response = await request(requestParams);
	// parse returned HTML response into array of currencies
	const currencies = parseCurrency(response);
	// return the rate of a specific currency
	return _.filter(currencies, _.matches({currencyCode: toCurrency}));
}

function parseCurrency(response) {
	// use cheerio to parse the HTML body
	const $ = cheerio.load(response);
	// get all tables in page
	const tables = $('table .etxtmed');
	// get respective tables which shows currencies rates
	// Hong Kong Dollars to 100 units of Foreign Currency
	const Unit100Rows = tables.eq(8).find('tbody').find('tr');
	const unit100currencies = parseRowToCurrency($, Unit100Rows, 100);
	// Hong Kong Dollars to 1 unit of Foreign Currency
	const Unit1Rows = tables.eq(9).find('tbody').find('tr');
	const unit1currencies = parseRowToCurrency($, Unit1Rows);
	// join 2 currencies array
	const currencies = _.concat(unit100currencies, unit1currencies);
	return currencies;
}

function parseRowToCurrency($, rows, unit) {
	const $rows = $(rows);
	return _.compact(_.map($rows, (row, index) => {
		if (index <= 2) { // useless stuff
			return null;
		}
		const $row = $(row);
		const $tds = $row.find('td');
		const currencyCode = $tds.eq(0).text().trim();
		const currency = $tds.eq(1).text().trim();
		let selling = parseFloat($tds.eq(2).text().trim());
		let buyingTT = parseFloat($tds.eq(3).text().trim());
		let buyingDD = parseFloat($tds.eq(4).text().trim());
		// if unit is provided, divide rate by unit
		if (unit) {
			selling = selling / unit;
			buyingTT = buyingTT / unit;
			buyingDD = buyingDD / unit;
		}
		return {currencyCode, currency, selling, buyingTT, buyingDD};
	}));
}

function validateDate(date) {
	const { day, month, year } = date;
	if (!moment(`${day}-${month}-${year}`, 'DD-MM-YYYY').isValid()) {
		throw new Error('Date is invalid');
	}
}

// export the function queryCurrency
module.exports = queryCurrency;
