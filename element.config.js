// eslint-disable-next-line no-undef
module.exports = {
	options: {
		actionDelay: 1,
		stepDelay: 1,
		headless: true,
		devtools: false,
		sandbox: true,
		watch: false,
		loopCount: 1,
		strict: false,
		failStatusCode: 1,
		verbose: false,
	},
	paths: {
		workRoot: '.',
		testDataRoot: '.',
		testPathMatch: ['./*.perf*.ts'],
	},
	flood: {
		hosted: false,
		vu: 500,
		duration: 15,
		rampup: 0,
		regions: [''],
	},
};
