import { step, TestSettings, By, Until, Key, Browser, Locator } from '@flood/element';
import assert from 'assert';

const CHALLENGE_URL = 'https://flood-element-challenge.vercel.app/';

export const settings: TestSettings = {
	loopCount: 1,
	clearCache: false,
	clearCookies: false,
	disableCache: false,
	screenshotOnFailure: true,
	actionDelay: '1s',
	stepDelay: '2s',
};

const byPartialAttr = (tag: string, name: string, value: string) => By.js((tag, name, value) => (
	Array.from(document.querySelectorAll(tag))
		.filter(el => el.getAttribute(name)?.startsWith(value))
), tag, name, value);

const confirmStep = async (step: number, browser: Browser) => {
	await browser.click(By.visibleText('CHECK'));
	await browser.wait(Until.elementIsVisible(By.visibleText('Your answer is correct!')));
	await browser.click(By.visibleText('NEXT'));
	await browser.wait(Until.elementIsVisible(By.visibleText(`Step ${step + 1}/8`)));
};

const getDollarValue = async (locator: Locator, browser: Browser) => {
	const el = await browser.findElement(locator);
	const text = await el.text();
	return Number(text.replace('$', ''));
};

const runOnEachProductPage = async (fn: () => Promise<void>, browser: Browser) => {
	await fn();

	const pagination = await browser.findElement(By.id('product-list-pagination'));
	const paginationButtons = await pagination.findElements(By.tagName('button'));
	const [firstPaginationButton, ...remainingPaginationButtons] = paginationButtons.slice(1, paginationButtons.length - 1);

	for (const remainingPaginationButton of remainingPaginationButtons) {
		await browser.click(remainingPaginationButton);
		await fn();
	}

	if (remainingPaginationButtons.length > 0) {
		await browser.click(firstPaginationButton);
	}
};

const minimizePopup = async (browser: Browser) => {
	const minimizeChallengesPopup = await browser.findElement(By.attr('button', 'data-test-minimize', 'true'));
	await minimizeChallengesPopup.click();
};

const maximizePopup = async (browser: Browser) => {
	const maximizeChallengesPopup = await browser.findElement(By.attr('button', 'data-test-maximize', 'true'));
	await maximizeChallengesPopup.click();
};

const adjustPriceRange = async (min: number, max: number, browser: Browser) => {
	const priceRangeMin = await browser.findElement(By.xpath('//h5[text()="Price range"]/../span/span[3]'));
	const priceRangeMax = await browser.findElement(By.xpath('//h5[text()="Price range"]/../span/span[4]'));

	const rightKeys = Array.from({ length: min - 50 }).map(() => Key.ARROW_RIGHT);

	await browser.click(priceRangeMin);
	await browser.sendKeys(...rightKeys);

	// bug: first click takes away 5 from total in --no-headless
	const leftKeys = Array.from({ length: 2000 - max }).map(() => Key.ARROW_LEFT);

	await browser.click(priceRangeMax);
	await browser.sendKeys(...leftKeys);
};

export default () => {
	step('Visit site', async browser => {
		await browser.visit(CHALLENGE_URL);
	});

	step('Take the challenge', async browser => {
		await browser.click(By.visibleText('TAKE THE CHALLENGE'));
		await browser.wait(Until.elementIsVisible(By.id('challenges-popup')));
	});

	step('1/8', async browser => {
		const banner = await browser.findElement(By.partialVisibleText('Get up to'));
		const bannerText = await banner.text();

		const maximumDiscount = bannerText.match(/Get up to (.*)% Off/)?.[1];

		assert(maximumDiscount);

		await browser.click(By.id(`challenge-1-option-${maximumDiscount}`));

		await confirmStep(1, browser);
	});

	step('2/8', async browser => {
		const category = await browser.findElement(By.id('challenge-2-category'));
		const categoryText = await category.text();

		await browser.click(By.attr('button', 'value', categoryText));
		const products = await browser.findElements(By.css('#new-arrivals-panel a'));

		await browser.click(By.id(`challenge-2-option-${products.length}`));

		await confirmStep(2, browser);
	});

	step('3/8', async browser => {
		await browser.click(By.visibleText('Reveal the deal'));

		const deal = await browser.findElement(By.partialVisibleText('Use the code'));
		const dealText = await deal.text();
		const dealCode = dealText.match(/Use the code "(.*)" to buy .*/)?.[1];

		assert(dealCode);

		await browser.type(By.id('challenge-3-promotion-code'), dealCode);

		await confirmStep(3, browser);
	});

	step('4/8', async browser => {
		await browser.click(By.attr('a', 'href', '/products'));

		await confirmStep(4, browser);
	});

	step('5/8', async browser => {
		const minPrice = await getDollarValue(By.id('challenge-5-min-price'), browser);
		const maxPrice = await getDollarValue(By.id('challenge-5-max-price'), browser);

		await minimizePopup(browser);
		await adjustPriceRange(minPrice, maxPrice, browser);
		await maximizePopup(browser);

		let totalProducts = 0;

		await runOnEachProductPage(async () => {
			const products = await browser.findElements(byPartialAttr('a', 'href', '/products/'));
			totalProducts += products.length;
		}, browser);

		await browser.type(By.id('challenge-5-amount-products'), `${totalProducts}`);
		await confirmStep(5, browser);
	});

	step('6/8', async browser => {
		await runOnEachProductPage(async () => {
			const products = await browser.findElements(byPartialAttr('a', 'href', '/products/'));

			for (const product of products) {
				// bug: product.focus() does not scroll into view in headless mode
				await product.element.hover();

				// bug: does not work in headless mode
				// await browser.wait(Until.elementLocated(By.visibleText('add to cart')))
				await browser.wait(0.5);
				await browser.click(By.visibleText('add to cart'));

				const modalContainer = await browser.findElement(By.attr('div', 'role', 'presentation'));
				const addToCart = await modalContainer.findElement(By.visibleText('Add to cart'));

				await addToCart?.click();

				const modalClose = await modalContainer.findElement(
					By.attr('button', 'data-test-product-detail-modal-close', 'true')
				);

				await modalClose?.click();
			}
		}, browser);

		await confirmStep(6, browser);
	});

	step('7/8', async browser => {
		await browser.click(By.attr('a', 'href', '/'));
		await browser.click(By.attr('a', 'href', '/products'));
		const category = await browser.findElement(By.id('challenge-7-category'));
		const size = await browser.findElement(By.id('challenge-7-size'));
		const priceMin = await browser.findElement(By.id('challenge-7-min-price'));
		const priceMax = await browser.findElement(By.id('challenge-7-max-price'));

		const categoryText = await category.text();
		const sizeText = await size.text();
		const priceMinText = await priceMin.text();
		const priceMaxText = await priceMax.text();

		await minimizePopup(browser);
		await browser.click(By.attr('input', 'name', categoryText));
		await browser.click(By.attr('input', 'name', sizeText));
		await adjustPriceRange(Number(priceMinText), Number(priceMaxText), browser);
		await maximizePopup(browser);

		await confirmStep(7, browser);
	});

	step('8/8', async browser => {
		const minPrice = await getDollarValue(By.id('challenge-8-min-price'), browser);
		const maxPrice = await getDollarValue(By.id('challenge-8-max-price'), browser);

		await browser.click(By.id('cart-button'));

		const currentPriceLocator = By.id('subtotal-price');
		let currentPrice = await getDollarValue(currentPriceLocator, browser);

		while (currentPrice < minPrice) {
			await browser.click(By.attr('button', 'data-test-add', 'true'));
			currentPrice = await getDollarValue(currentPriceLocator, browser);
		}

		while (currentPrice > maxPrice) {
			await browser.click(By.attr('button', 'data-test-minus', 'true'));
			const newCurrentPrice = await getDollarValue(currentPriceLocator, browser);

			if (currentPrice === newCurrentPrice) {
				await browser.click(By.attr('button', 'data-test-remove', 'true'));
			}

			currentPrice = newCurrentPrice;
		}

		await browser.click(By.visibleText('CHECK'));
	});
};
