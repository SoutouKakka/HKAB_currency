'use strict';

const checkCurrency = require('./lib/currency_helper');

checkCurrency('JPY', {
	day: '13',
	month: '03',
	year: '2019'
})
	.then(value => console.log(value))
	.catch(err => console.log(err));
