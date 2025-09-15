import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulationService {
    // constructor(
    //     private readonly utilsService: UtilsService,
    //     private readonly genAiService: GenAiService,
    //     private readonly loggerService: LoggerService,
    //     private readonly puppeteerService: PuppeteerService,
    //     private readonly visionService: GoogleVisionService,
    // ) {}
    // public async simulateTaxLoginFlow(
    //     customer: CustomerEntity,
    //     revenue: number,
    //     taxPeriod: Date,
    //     attachmentPath: string,
    //     declarationId: string,
    //     pageId: string,
    // ): Promise<SimulateTaxLoginFlowResponseDto> {
    //     this.loggerService.log('Get current page');
    //     const page: Page = await this.getCurrentPage(pageId);
    //     this.loggerService.log('Navigate to login page');
    //     await page.goto(SIMULATION_LINK.TAX_LOGIN_PAGE);
    //     this.loggerService.log('Set screen size');
    //     await page.setViewport({ width: 1080, height: 1024 });
    //     try {
    //         this.loggerService.log('Get action buttons - Login Flow');
    //         const actionButtons = await page.$('.BlockItem.col-auto[onclick="dangNhapLDAP()"]');
    //         if (!actionButtons) throw new NotFoundException('action_button_not_found');
    //         this.loggerService.log('Click action buttons - Login Flow');
    //         await actionButtons?.click();
    //         this.loggerService.log('Wait for modal to appear - Login Flow');
    //         await page.waitForSelector('#modalChonDoiTuong', { visible: true });
    //         this.loggerService.log('Get login button for Cá nhân - Login Flow');
    //         const caNhanButton = await page.$('a[type="button"][hx-on\\:click^="processChonDT(\'CN\'"]');
    //         if (!caNhanButton) throw new NotFoundException('ca_nhan_login_button_not_found');
    //         this.loggerService.log('Click Cá nhân login button - Login Flow');
    //         await caNhanButton?.click();
    //         this.loggerService.log('Click login button - Login Flow');
    //         await page.waitForSelector('#modalContentLoginLDAP');
    //         let noOfCaptchaInput = 0;
    //         do {
    //             this.loggerService.log('Get refresh captcha button - Login Flow');
    //             const refreshCaptcha = await page.$('button.btn#btnReloadCaptcha[hx-on\\:click="reloadCaptcha()"]');
    //             if (!refreshCaptcha) throw new NotFoundException('refresh_captcha_button_not_found');
    //             if (noOfCaptchaInput > 0) {
    //                 this.loggerService.log('Click refresh captcha button - Login Flow');
    //                 await refreshCaptcha?.click();
    //             }
    //             this.loggerService.log('Get captcha value - Login Flow');
    //             let captchaValue = await this.getCaptchaValue(page, { keyImage: 'getCaptcha' });
    //             if (captchaValue) {
    //                 captchaValue = captchaValue.replaceAll(' ', '');
    //             } else {
    //                 this.loggerService.warn('Captcha not found, refreshing captcha and retrying');
    //                 noOfCaptchaInput++;
    //                 continue;
    //             }
    //             this.loggerService.log(' Clear and fill username value - Login Flow');
    //             await page.$eval('input[name="tenDN"]', (el: any) => (el.value = ''));
    //             await page.type('input[name="tenDN"]', customer.usernameTax);
    //             this.loggerService.log('Clear and fill password value - Login Flow');
    //             await page.$eval('input[name="matKhau"]', (el: any) => (el.value = ''));
    //             await page.type('input[name="matKhau"]', customer.passwordTax);
    //             this.loggerService.log('Clear and fill captcha value - Login Flow');
    //             await page.$eval('input[name="captcha"]', (el: any) => (el.value = ''));
    //             await page.type('input[name="captcha"]', captchaValue);
    //             this.loggerService.log('Get login button - Login Flow');
    //             const loginButton = await page.$(
    //                 '.modal-footer>button.btn.btn-primary.btn-sm.me-2[type="button"][hx-on\\:click="submitLDAP()"]',
    //             );
    //             if (!loginButton) throw new NotFoundException('login_button_not_found');
    //             this.loggerService.log('Click login button - Login Flow');
    //             await loginButton?.click();
    //             await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.LOGIN_PAGE_NAVIGATION));
    //             this.loggerService.log('Get notification element - Login Flow');
    //             const lobiboxNotifyMsgElement = await page.$('.lobibox-notify-msg');
    //             if (!lobiboxNotifyMsgElement) {
    //                 this.loggerService.log('Wait for page navigation after login - Login Flow');
    //                 break;
    //             }
    //             this.loggerService.warn('Captcha incorrect, refreshing captcha and retrying');
    //             noOfCaptchaInput++;
    //         } while (noOfCaptchaInput < MAX_CAPTCHA_INPUT);
    //         if (noOfCaptchaInput >= MAX_CAPTCHA_INPUT) {
    //             this.loggerService.warn('Captcha incorrect, closing browser');
    //             throw new NotFoundException('captcha_incorrect');
    //         }
    //         this.loggerService.log('Wait notification for 500ms - Login Flow');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.NOTIFICATION_WAIT));
    //         this.loggerService.log('Wait select declaration form - Login Flow');
    //         const isSelectDeclarationForm: boolean = await this.selectDeclarationForm(
    //             pageId,
    //             customer,
    //             revenue,
    //             taxPeriod,
    //             attachmentPath,
    //             declarationId,
    //         );
    //         if (!isSelectDeclarationForm) {
    //             this.loggerService.warn('Wait close browser when select declaration form failed');
    //             await this.closeBrowser(pageId, page);
    //         }
    //         return new SimulateTaxLoginFlowResponseDto({
    //             inputOtp: isSelectDeclarationForm,
    //             isSuccess: isSelectDeclarationForm,
    //         });
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         await this.closeBrowser(pageId, page);
    //         return new SimulateTaxLoginFlowResponseDto({
    //             inputOtp: false,
    //             isSuccess: false,
    //         });
    //     }
    // }
    // public async selectDeclarationForm(
    //     pageId: string,
    //     customer: CustomerEntity,
    //     revenue: number,
    //     taxPeriod: Date,
    //     attachmentPath: string,
    //     declarationId: string,
    // ): Promise<boolean> {
    //     this.loggerService.log('Get current page - Declaration Form');
    //     const page: Page = await this.getCurrentPage(pageId);
    //     this.loggerService.log('Navigate to declaration form page');
    //     await page.goto(SIMULATION_LINK.TAX_DECLARATION_FORM_PAGE);
    //     this.loggerService.log('Clear and fill maTTHC value - Declaration Form');
    //     await page.$eval('input[name="maTTHC"]', (el: any) => (el.value = ''));
    //     await page.type('input[name="maTTHC"]', MA_TTHC);
    //     this.loggerService.log('Get search button - Declaration Form');
    //     const searchButton = await page.$('#btnTthcSearchHome');
    //     if (!searchButton) throw new NotFoundException('search_button_not_found');
    //     this.loggerService.log('Click search button - Declaration Form');
    //     await searchButton.click();
    //     this.loggerService.log('Wait for result table reload 3s - Declaration Form');
    //     await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.TABLE_RESULT_WAIT));
    //     this.loggerService.log('Get target link in result table - Declaration Form');
    //     const targetLink = await page.$('.bangKetQuaTTHC.menuSelectSSO tbody tr td:nth-child(6) a');
    //     if (!targetLink) throw new NotFoundException('target_link_not_found');
    //     this.loggerService.log('Click target button - Declaration Form');
    //     await targetLink.click();
    //     this.loggerService.log('Wait for modal select SSO - Declaration Form');
    //     await page.waitForSelector('button[onclick="selectData()"]');
    //     this.loggerService.log('Wait for target link wait 3s - Declaration Form');
    //     await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.TARGET_LINK_WAIT));
    //     this.loggerService.log('Get continue button - Declaration Form');
    //     const continueButton = await page.$('button[onclick="selectData()"]');
    //     if (!continueButton) throw new NotFoundException('continue_button_not_found');
    //     this.loggerService.log('Click continue button - Declaration Form');
    //     await continueButton?.click();
    //     this.loggerService.log('Wait for getting frame - Declaration Form');
    //     const frame = await this.getFrameContent(page);
    //     if (!frame) throw new NotFoundException('can_not_get_frame_content');
    //     this.loggerService.log('Wait for getting declare form - Declaration Form');
    //     await frame.waitForSelector('#mauTKhai');
    //     const declareFormOptions = await frame.$('#mauTKhai');
    //     if (!declareFormOptions) throw new NotFoundException('declare_form_not_found');
    //     this.loggerService.log('Wait for select declare form - Declaration Form');
    //     await declareFormOptions.select('retailCnkd01TT40Proc');
    //     await frame.select('#mauTKhai', 'retailCnkd01TT40Proc');
    //     await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.DECLARATION_FORM_SELECT_DELAY));
    //     this.loggerService.log('Wait for getting continue button - Declaration Form');
    //     const continueFormAction = await frame.$('.inputBtn.awesome');
    //     this.loggerService.log('Wait for click continue button - Declaration Form');
    //     await continueFormAction?.click();
    //     this.loggerService.log('Wait for continue button wait 3s - Declaration Form');
    //     await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CONTINUE_BUTTON_WAIT));
    //     this.loggerService.log('Wait for select business address - Declaration Form');
    //     await frame.waitForSelector('#dchiKDOp');
    //     this.loggerService.log('Wait for select business address - Declaration Form');
    //     const businessAddressSelect = await frame.$('#dchiKDOp');
    //     if (!businessAddressSelect) throw new NotFoundException('business_address_select_not_found');
    //     this.loggerService.log('Wait for select business address - Declaration Form');
    //     await businessAddressSelect.select(customer.usernameTax);
    //     await frame.select('#dchiKDOp', customer.usernameTax);
    //     this.loggerService.log('Wait for getting continue button business - Declaration Form');
    //     const continueFormBusinessAction = await frame.$('input.inputBtn.awesome[onclick="next()"]');
    //     this.loggerService.log('Wait for click continue button business - Declaration Form');
    //     await continueFormBusinessAction?.click();
    //     this.loggerService.log('Wait for filling form TT40 - Declaration Form');
    //     const isFilledPresetInformationTT40: boolean = await this.fillPresetInformationTT40(
    //         pageId,
    //         page,
    //         frame,
    //         customer,
    //         revenue,
    //         taxPeriod,
    //         attachmentPath,
    //         declarationId,
    //     );
    //     return isFilledPresetInformationTT40;
    // }
    // public async simulateInvoiceLoginFlow(customer: CustomerEntity, pageId: string): Promise<SimulateInvoiceLoginFlowResponseDto> {
    //     this.loggerService.log('Get current page');
    //     const page: Page = await this.getCurrentPage(pageId);
    //     this.loggerService.log('Navigate to login page');
    //     await page.goto(SIMULATION_LINK.INVOICE_LOGIN_PAGE);
    //     this.loggerService.log('Set screen size');
    //     await page.setViewport({ width: 1080, height: 1024 });
    //     try {
    //         this.loggerService.log('Wait for close button to appear - Login Flow');
    //         const closeButton = await page.$('.ant-modal-close');
    //         if (closeButton) await closeButton.click();
    //         const loginMenuItems = await page.$$('.ant-col.home-header-menu-item span');
    //         if (!loginMenuItems?.length) throw new NotFoundException('login_menu_item_not_found');
    //         await page.evaluate((el) => el.click(), loginMenuItems[1]);
    //         let noOfCaptchaInput = 0;
    //         do {
    //             this.loggerService.log('Get refresh captcha button - Login Flow');
    //             const refreshCaptcha = await page.$('div[class^="Captcha__ImageWrapper"] button');
    //             if (!refreshCaptcha) throw new NotFoundException('refresh_captcha_button_not_found');
    //             if (noOfCaptchaInput > 0) {
    //                 this.loggerService.log('Click refresh captcha button - Login Flow');
    //                 await refreshCaptcha?.click();
    //             }
    //             this.loggerService.log('Get captcha value - Login Flow');
    //             let captchaValue = await this.getCaptchaValue(page, {
    //                 useBase64: true,
    //                 keyImage: 'div[class^="Captcha__ImageWrapper"] img',
    //             });
    //             if (captchaValue) {
    //                 captchaValue = captchaValue.replaceAll(' ', '');
    //             } else {
    //                 this.loggerService.warn('Captcha not found, refreshing captcha and retrying');
    //                 noOfCaptchaInput++;
    //                 continue;
    //             }
    //             this.loggerService.log(' Clear and fill username value - Login Flow');
    //             await page.$eval('input#username', (el: any) => (el.value = ''));
    //             await page.type('input#username', customer.usernameTax);
    //             this.loggerService.log('Clear and fill password value - Login Flow');
    //             await page.$eval('input#password', (el: any) => (el.value = ''));
    //             await page.type('input#password', customer.passwordTax);
    //             this.loggerService.log('Clear and fill captcha value - Login Flow');
    //             await page.$eval('input#cvalue', (el: any) => (el.value = ''));
    //             await page.type('input#cvalue', captchaValue);
    //             this.loggerService.log('Get login button - Login Flow');
    //             const loginButton = await page.$('button[class^="ButtonAnt__Button"]');
    //             if (!loginButton) throw new NotFoundException('login_button_not_found');
    //             this.loggerService.log('Click login button - Login Flow');
    //             await loginButton?.click();
    //             await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.LOGIN_PAGE_NAVIGATION));
    //             this.loggerService.log('Get notification element - Login Flow');
    //             const lobiboxNotifyMsgElement = await page.$('.lobibox-notify-msg');
    //             if (!lobiboxNotifyMsgElement) {
    //                 this.loggerService.log('Wait for page navigation after login - Login Flow');
    //                 break;
    //             }
    //             this.loggerService.warn('Captcha incorrect, refreshing captcha and retrying');
    //             noOfCaptchaInput++;
    //         } while (noOfCaptchaInput < MAX_CAPTCHA_INPUT);
    //         if (noOfCaptchaInput >= MAX_CAPTCHA_INPUT) {
    //             this.loggerService.warn('Captcha incorrect, closing browser');
    //             throw new NotFoundException('captcha_incorrect');
    //         }
    //         return new SimulateInvoiceLoginFlowResponseDto({
    //             inputOtp: true,
    //             isSuccess: true,
    //         });
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         await this.closeBrowser(pageId, page);
    //         return new SimulateInvoiceLoginFlowResponseDto({
    //             inputOtp: false,
    //             isSuccess: false,
    //         });
    //     }
    // }
    // private async fillPresetInformationTT40(
    //     pageId: string,
    //     page: Page,
    //     frame: Frame | undefined,
    //     customer: CustomerEntity,
    //     revenue: number,
    //     taxPeriod: Date,
    //     attachmentPath: string,
    //     declarationId: string,
    // ): Promise<boolean> {
    //     this.loggerService.log('Wait for getting submit button - Fill preset information TT40');
    //     await frame?.waitForSelector('#submitBtn');
    //     const businessType = customer.businessType;
    //     switch (businessType) {
    //         case String(BusinessTypeEnum.KEKHAI): {
    //             this.loggerService.log('Fill form information TT40 type Ke Khai - Fill preset information TT40');
    //             return this.fillFormInformationTT40TypeKeKhai(
    //                 pageId,
    //                 page,
    //                 frame,
    //                 customer,
    //                 revenue,
    //                 taxPeriod,
    //                 attachmentPath,
    //                 declarationId,
    //             );
    //         }
    //         default: {
    //             return false;
    //         }
    //     }
    // }
    // private async fillFormInformationTT40TypeKeKhai(
    //     pageId: string,
    //     page: Page,
    //     frame: Frame | undefined,
    //     customer: CustomerEntity,
    //     revenue: number,
    //     taxPeriod: Date,
    //     attachmentPath: string,
    //     declarationId: string,
    // ): Promise<boolean> {
    //     const { address, city, district, ward, businessGroup, brand, businessIndustries, businessArea, numberOfEmployees, transactions } =
    //         customer;
    //     const month: number = new Date(taxPeriod).getMonth() + 1;
    //     const year: number = new Date(taxPeriod).getFullYear();
    //     let quarter = '0';
    //     let from = '';
    //     let to = '';
    //     switch (true) {
    //         case month <= 3: {
    //             quarter = '1';
    //             from = `01/01/${year}`;
    //             to = `03/31/${year}`;
    //             break;
    //         }
    //         case month >= 4 && month <= 6: {
    //             quarter = '2';
    //             from = `04/01/${year}`;
    //             to = `06/30/${year}`;
    //             break;
    //         }
    //         case month >= 7 && month <= 9: {
    //             quarter = '3';
    //             from = `07/01/${year}`;
    //             to = `09/30/${year}`;
    //             break;
    //         }
    //         case month >= 10 && month <= 12: {
    //             quarter = '4';
    //             from = `10/01/${year}`;
    //             to = `12/31/${year}`;
    //             break;
    //         }
    //     }
    //     let laborCost = 0;
    //     let otherCost = 0;
    //     let waterCost = 0;
    //     let warehouseCost = 0;
    //     let electricityCost = 0;
    //     let administrationCost = 0;
    //     let telecommunicationCost = 0;
    //     let totalCost = 0;
    //     const expenseTransactions = transactions?.filter(
    //         (transaction: TransactionEntity) =>
    //             transaction.status !== String(TransactionStatusEnum.DECLARED_TAX) &&
    //             transaction.type === String(TransactiontypeEnum.CR) &&
    //             new Date(this.utilsService.getDateString(transaction.at as Date)) >= new Date(from) &&
    //             new Date(this.utilsService.getDateString(transaction.at as Date)) <= new Date(to),
    //     );
    //     if (expenseTransactions?.length) {
    //         for (const transaction of expenseTransactions) {
    //             const expenditureType: string | undefined = transaction.accountingCategory?.code;
    //             totalCost += Number(transaction.amount);
    //             switch (expenditureType) {
    //                 case AccountingCategoryCodeEnum.LABOR_COST: {
    //                     laborCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 case AccountingCategoryCodeEnum.ELECTRICITY_COST: {
    //                     electricityCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 case AccountingCategoryCodeEnum.WATER_COST: {
    //                     waterCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 case AccountingCategoryCodeEnum.TELECOMMUNICATION_COST: {
    //                     telecommunicationCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 case AccountingCategoryCodeEnum.ADMINISTRATION_COST: {
    //                     administrationCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 case AccountingCategoryCodeEnum.WAREHOUSE_COST: {
    //                     warehouseCost += Number(transaction.amount);
    //                     break;
    //                 }
    //                 default: {
    //                     otherCost += Number(transaction.amount);
    //                     break;
    //                 }
    //             }
    //         }
    //     }
    //     try {
    //         // Select information of declaration
    //         this.loggerService.log('Wait for select hinh thuc ke khai - TT40 Form');
    //         await frame?.select('#trO2 select', 'Q');
    //         this.loggerService.log('Wait for select quy - TT40 Form');
    //         await frame?.select('#trQuy select', quarter);
    //         this.loggerService.log('Wait for type year - TT40 Form');
    //         await frame?.type('#namKKhaiQuy', String(new Date(taxPeriod).getFullYear()));
    //         // Wait for submit button
    //         this.loggerService.log('Wait for submit button - TT40 Form');
    //         await frame?.waitForSelector('#submitBtn');
    //         this.loggerService.log('Wait for click submit button - TT40 Form');
    //         const submitFormAction = await frame?.$('#submitBtn');
    //         if (!submitFormAction) throw new NotFoundException('submit_form_action_not_found');
    //         this.loggerService.log('Wait for click submit button - TT40 Form');
    //         await submitFormAction?.click();
    //         // Wait for frame navigation
    //         this.loggerService.log('Wait for frame navigation - TT40 Form');
    //         await frame?.waitForNavigation();
    //         // Wait 1s for frame - TT40 Form
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Choose declaration's type
    //         this.loggerService.log('Wait for getting declaration type - TT40 Form');
    //         const chooseDeclarationType = await frame?.$('#hkdcnkdnopkekhai_cb');
    //         if (!chooseDeclarationType) throw new NotFoundException('choose_declaration_type_not_found');
    //         this.loggerService.log('Wait for click declaration type - TT40 Form');
    //         await chooseDeclarationType?.click();
    //         // Wait 1s for frame - TT40 Form
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Fill name of shop
    //         this.loggerService.log('Wait for clear name of shop - TT40 Form');
    //         await frame?.$eval('#ct05', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting name of shop - TT40 Form');
    //         const nameOfShop = await frame?.$('#ct05');
    //         if (!nameOfShop) throw new NotFoundException('name_of_shop_not_found');
    //         this.loggerService.log('Wait for typing name of shop - TT40 Form');
    //         await nameOfShop?.type(brand);
    //         // Set value for input from businessIndustryCode
    //         this.loggerService.log('Wait for getting option from #nghanhNgheDoanhThuCao - TT40 Form');
    //         const nghanhNgheDoanhThuCao = await frame?.$('#nghanhNgheDoanhThuCao');
    //         if (!nghanhNgheDoanhThuCao) throw new NotFoundException('nghanh_nghe_doanh_thu_cao_not_found');
    //         this.loggerService.log('Wait for select business industry - TT40 Form');
    //         const businessIndustryCode = businessIndustries?.find(
    //             (bi: BusinessIndustryEntity) => bi.circular === String(CircularEnum.TT40),
    //         );
    //         if (!businessIndustryCode) throw new NotFoundException('business_industry_option_not_found');
    //         this.loggerService.log('Wait for getting business industry option - TT40 Form');
    //         const businessIndustryOptions = await frame?.$$eval('#nghanhNgheDoanhThuCao option', (options: any) =>
    //             options.map((option: any) => ({
    //                 value: option.value,
    //                 text: option.textContent?.trim(),
    //             })),
    //         );
    //         const businessIndustryOption = businessIndustryOptions?.find((option: any) => option.value === businessIndustryCode?.code);
    //         if (!businessIndustryOption) throw new NotFoundException('business_industry_option_not_found');
    //         this.loggerService.log('Wait for setting value for business industry name - TT40 Form');
    //         await frame?.$eval(
    //             '#tenNNgheKDoanh_0',
    //             (el: any, value: string) => {
    //                 el.value = value;
    //             },
    //             businessIndustryOption?.text || '',
    //         );
    //         this.loggerService.log('Wait for setting value for maNNgheKDoanh_0 - TT40 Form');
    //         await frame?.$eval(
    //             '#maNNgheKDoanh_0',
    //             (el: any, value: string) => {
    //                 el.value = value;
    //             },
    //             businessIndustryOption?.value || '',
    //         );
    //         // Input business area
    //         this.loggerService.log('Wait for clear business area - TT40 Form');
    //         await frame?.$eval('#ct09', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting business area - TT40 Form');
    //         const acreage = await frame?.$('#ct09');
    //         if (!acreage) throw new NotFoundException('acreage_not_found');
    //         this.loggerService.log('Wait for typing business area - TT40 Form');
    //         await frame?.$eval('#ct09', (el: any, value: string) => (el.value = value), businessArea?.toFixed(2));
    //         // Input number of employee
    //         this.loggerService.log('Wait for getting number of employee - TT40 Form');
    //         const noOfEmployees = await frame?.$('#ct10');
    //         if (!noOfEmployees) throw new NotFoundException('number_of_employee_not_found');
    //         this.loggerService.log('Wait for typing number of employee - TT40 Form');
    //         await frame?.$eval(
    //             '#ct10',
    //             (el: any, value: string) => {
    //                 el.value = value;
    //             },
    //             numberOfEmployees?.toFixed(2),
    //         );
    //         // Input address
    //         this.loggerService.log('Wait for clear address - TT40 Form');
    //         await frame?.$eval('#ct12BSoNha', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting address - TT40 Form');
    //         const addressBtn = await frame?.$('#ct12BSoNha');
    //         if (!addressBtn) throw new NotFoundException('address_not_found');
    //         this.loggerService.log('Wait for typing address - TT40 Form');
    //         await frame?.$eval('#ct12BSoNha', (el: any, value: string) => (el.value = value), String(address));
    //         //   // Select city
    //         //   this.loggerService.log('Wait for getting city - TT40 Form');
    //         //   const cityBtn = await frame?.$('#tinhDCKD');
    //         //   if (!cityBtn) throw new NotFoundException('city_not_found');
    //         //   this.loggerService.log('Wait for select city - TT40 Form');
    //         //   await cityBtn?.select(city ? city.code : '');
    //         //   // Select ward
    //         //   this.loggerService.log('Wait for getting ward - TT40 Form');
    //         //   const wardBtn = await frame?.$('#phuongDCKD');
    //         //   if (!wardBtn) throw new NotFoundException('ward_not_found');
    //         //   this.loggerService.log('Wait for select ward - TT40 Form');
    //         //   await wardBtn?.select(ward ? ward.code : '');
    //         // Need to wait x second here
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Input revenue for VAT and PIT
    //         this.loggerService.log('Wait for clear revenue for VAT and PIT - TT40 Form');
    //         await frame?.$eval(`#doanhThuThueTNCN_${businessGroup}`, (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting revenue for VAT and PIT - TT40 Form');
    //         const revenuePersonalTax = await frame?.$(`#doanhThuThueTNCN_${businessGroup}`);
    //         if (!revenuePersonalTax) throw new NotFoundException('revenue_personal_tax_not_found');
    //         this.loggerService.log('Wait for typing revenue for VAT and PIT - TT40 Form');
    //         await revenuePersonalTax?.type(String(revenue));
    //         this.loggerService.log('Wait for clear revenue for VAT and PIT - TT40 Form');
    //         await frame?.$eval(`#doanhThuThueGTGT_${businessGroup}`, (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting revenue for VAT and PIT - TT40 Form');
    //         const revenueTax = await frame?.$(`#doanhThuThueGTGT_${businessGroup}`);
    //         if (!revenueTax) throw new NotFoundException('revenue_tax_not_found');
    //         this.loggerService.log('Wait for typing revenue for VAT and PIT - TT40 Form');
    //         await revenueTax?.type(String(revenue));
    //         // Wait 500ms for frame
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         // Add appendix
    //         this.loggerService.log('Wait for getting add appendix button - TT40 Form');
    //         const addAppendixBtn = await frame?.$('#addPLucButton');
    //         if (!addAppendixBtn) throw new NotFoundException('add_appendix_button_not_found');
    //         this.loggerService.log('Wait for click add appendix button - TT40 Form');
    //         await addAppendixBtn?.click();
    //         // Wait 1s for frame
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Select appendix
    //         this.loggerService.log('Wait for getting select appendix button - TT40 Form');
    //         const selectAppendixBtn = await frame?.$('#pluc01');
    //         if (!selectAppendixBtn) throw new NotFoundException('select_appendix_button_not_found');
    //         this.loggerService.log('Wait for click select appendix button - TT40 Form');
    //         await selectAppendixBtn?.click();
    //         // Wait 1s for frame
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Accept button
    //         this.loggerService.log('Wait for getting accept button - TT40 Form');
    //         const acceptBtn = await frame?.$('#accept');
    //         if (!acceptBtn) throw new NotFoundException('accept_button_not_found');
    //         this.loggerService.log('Wait for click accept button - TT40 Form');
    //         await acceptBtn?.click();
    //         this.loggerService.log('Wait for frame navigation - TT40 Form');
    //         await frame?.waitForNavigation();
    //         // Wait 1.5s for frame
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_SUBMISSION_DELAY));
    //         // Go into appendix to fill
    //         this.loggerService.log('Wait for getting go into appendix button - TT40 Form');
    //         const goToAppendixBtn = await frame?.$('#div_label_pluc_01_02cnkd');
    //         if (!goToAppendixBtn) throw new NotFoundException('go_into_appendix_button_not_found');
    //         this.loggerService.log('Wait for click go into appendix button - TT40 Form');
    //         await goToAppendixBtn?.click();
    //         // Wait 500ms for frame
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         // Fill tool input 1
    //         this.loggerService.log('Wait for clear tool input 1 - TT40 Form');
    //         await frame?.$eval('#plct06_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 1 - TT40 Form');
    //         const toolInput1 = await frame?.$('#plct06_3');
    //         if (!toolInput1) throw new NotFoundException('tool1_not_found');
    //         this.loggerService.log('Wait for typing tool input 1 - TT40 Form');
    //         await toolInput1.type(String(0));
    //         // Fill tool input 2
    //         this.loggerService.log('Wait for clear tool input 2 - TT40 Form');
    //         await frame?.$eval('#plct07_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 2 - TT40 Form');
    //         const toolInput2 = await frame?.$('#plct07_3');
    //         if (!toolInput2) throw new NotFoundException('tool2_not_found');
    //         this.loggerService.log('Wait for typing tool input 2 - TT40 Form');
    //         await toolInput2.type(String(0));
    //         // Fill tool input 3
    //         this.loggerService.log('Wait for clear tool input 3 - TT40 Form');
    //         await frame?.$eval('#plct08_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 3 - TT40 Form');
    //         const toolInput3 = await frame?.$('#plct08_3');
    //         if (!toolInput3) throw new NotFoundException('tool3_not_found');
    //         this.loggerService.log('Wait for typing tool input 3 - TT40 Form');
    //         await toolInput3.type(String(0));
    //         // Fill tool input 4
    //         this.loggerService.log('Wait for clear tool input 4 - TT40 Form');
    //         await frame?.$eval('#plct09_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 4 - TT40 Form');
    //         const toolInput4 = await frame?.$('#plct09_3');
    //         if (!toolInput4) throw new NotFoundException('tool4_not_found');
    //         this.loggerService.log('Wait for typing tool input 4 - TT40 Form');
    //         await toolInput4.type(String(0));
    //         // Fill tool input 5
    //         this.loggerService.log('Wait for clear tool input 5 - TT40 Form');
    //         await frame?.$eval('#plct10_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 5 - TT40 Form');
    //         const toolInput5 = await frame?.$('#plct10_3');
    //         if (!toolInput5) throw new NotFoundException('tool5_not_found');
    //         this.loggerService.log('Wait for typing tool input 5 - TT40 Form');
    //         await toolInput5.type(String(0));
    //         // Fill tool input 6
    //         this.loggerService.log('Wait for clear tool input 6 - TT40 Form');
    //         await frame?.$eval('#plct11_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 6 - TT40 Form');
    //         const toolInput6 = await frame?.$('#plct11_3');
    //         if (!toolInput6) throw new NotFoundException('tool6_not_found');
    //         this.loggerService.log('Wait for typing tool input 6 - TT40 Form');
    //         await toolInput6.type(String(0));
    //         // Fill tool input 7
    //         this.loggerService.log('Wait for clear tool input 7 - TT40 Form');
    //         await frame?.$eval('#plct12_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 7 - TT40 Form');
    //         const toolInput7 = await frame?.$('#plct12_3');
    //         if (!toolInput7) throw new NotFoundException('tool7_not_found');
    //         this.loggerService.log('Wait for typing tool input 7 - TT40 Form');
    //         await toolInput7.type(String(0));
    //         // Fill tool input 8
    //         this.loggerService.log('Wait for clear tool input 8 - TT40 Form');
    //         await frame?.$eval('#plct13_3', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting tool input 8 - TT40 Form');
    //         const toolInput8 = await frame?.$('#plct13_3');
    //         if (!toolInput8) throw new NotFoundException('tool8_not_found');
    //         this.loggerService.log('Wait for typing tool input 8 - TT40 Form');
    //         await toolInput8.type(String(0));
    //         // Fill labor cost
    //         this.loggerService.log('Wait for clear labor cost - TT40 Form');
    //         await frame?.$eval('#plct24', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting labor cost - TT40 Form');
    //         const laborCostInput = await frame?.$('#plct24');
    //         if (!laborCostInput) throw new NotFoundException('labor_cost_not_found');
    //         this.loggerService.log('Wait for typing labor cost - TT40 Form');
    //         await laborCostInput.type(String(laborCost));
    //         // Fill electricity cost
    //         this.loggerService.log('Wait for clear electricity cost - TT40 Form');
    //         await frame?.$eval('#plct25', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting electricity cost - TT40 Form');
    //         const electricityCostInput = await frame?.$('#plct25');
    //         if (!electricityCostInput) throw new NotFoundException('electricity_cost_not_found');
    //         this.loggerService.log('Wait for typing electricity cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await electricityCostInput.type(String(electricityCost));
    //         // Fill water cost
    //         this.loggerService.log('Wait for clear water cost - TT40 Form');
    //         await frame?.$eval('#plct26', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting water cost - TT40 Form');
    //         const waterCostInput = await frame?.$('#plct26');
    //         if (!waterCostInput) throw new NotFoundException('water_cost_not_found');
    //         this.loggerService.log('Wait for typing water cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await waterCostInput.type(String(waterCost));
    //         // Fill telecommunication cost
    //         this.loggerService.log('Wait for clear telecommunication cost - TT40 Form');
    //         await frame?.$eval('#plct27', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting telecommunication cost - TT40 Form');
    //         const telecommunicationCostInput = await frame?.$('#plct27');
    //         if (!telecommunicationCostInput) throw new NotFoundException('telecommunication_cost_not_found');
    //         this.loggerService.log('Wait for typing telecommunication cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await telecommunicationCostInput.type(String(telecommunicationCost));
    //         // Fill warehouse cost
    //         this.loggerService.log('Wait for clear warehouse cost - TT40 Form');
    //         await frame?.$eval('#plct28', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting warehouse cost - TT40 Form');
    //         const warehouseCostInput = await frame?.$('#plct28');
    //         if (!warehouseCostInput) throw new NotFoundException('warehouse_cost_not_found');
    //         this.loggerService.log('Wait for typing warehouse cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await warehouseCostInput.type(String(warehouseCost));
    //         // Fill administration cost
    //         this.loggerService.log('Wait for clear administration cost - TT40 Form');
    //         await frame?.$eval('#plct29', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting administration cost - TT40 Form');
    //         const administrationCostInput = await frame?.$('#plct29');
    //         if (!administrationCostInput) throw new NotFoundException('admin_cost_not_found');
    //         this.loggerService.log('Wait for typing administration cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await administrationCostInput.type(String(administrationCost));
    //         // Fill other cost
    //         this.loggerService.log('Wait for clear other cost - TT40 Form');
    //         await frame?.$eval('#plct30', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting other cost - TT40 Form');
    //         const otherCostInput = await frame?.$('#plct30');
    //         if (!otherCostInput) throw new NotFoundException('other_cost_not_found');
    //         this.loggerService.log('Wait for typing other cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await otherCostInput.type(String(otherCost));
    //         // Fill total cost
    //         this.loggerService.log('Wait for getting total cost - TT40 Form');
    //         await frame?.$eval('#plct31', (el: any) => (el.value = ''));
    //         this.loggerService.log('Wait for getting total cost - TT40 Form');
    //         const totalCostInput = await frame?.$('#plct31');
    //         if (!totalCostInput) throw new NotFoundException('total_cost_not_found');
    //         this.loggerService.log('Wait for typing total cost - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await totalCostInput.type(String(totalCost));
    //         // Submit declaration
    //         this.loggerService.log('Wait for getting submit declaration button - TT40 Form');
    //         const submitAction = await frame?.$('.btn_type1[value="Hoàn thành kê khai >>"]');
    //         if (!submitAction) throw new NotFoundException('complete_declaration_button_not_found');
    //         this.loggerService.log('Wait for click submit declaration button - TT40 Form');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await submitAction.click();
    //         this.loggerService.log('Wait for frame navigation - TT40 Form');
    //         await frame?.waitForNavigation();
    //         // Download XML file
    //         this.loggerService.log('Wait for download XML declaration form - TT40 Form');
    //         await this.downloadXMLDeclarationForm(page, frame, declarationId);
    //         // Upload documents
    //         this.loggerService.log('Wait for upload file - TT40 Form');
    //         await this.submitFile(revenue, pageId, CircularEnum.TT40, attachmentPath);
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Confirm submission
    //         this.loggerService.log('Wait for confirm submission - TT40 Form');
    //         await this.confirmSubmission(page, frame);
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         // Confirm Otp
    //         this.loggerService.log('Wait for confirm OTP - TT40 Form');
    //         const isShowConfirmOtp: boolean = await this.confirmOtp(pageId);
    //         return isShowConfirmOtp;
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException(`can_not_fill_form_information_tt40_type_ke_khai: ${error}`);
    //     }
    // }
    // private async downloadXMLDeclarationForm(page: Page, frame: Frame | undefined, declarationId: string): Promise<void> {
    //     this.loggerService.log('Wait for creating CDPSession - Download XML');
    //     const client: CDPSession = await page.target().createCDPSession();
    //     await client.send('Page.setDownloadBehavior', {
    //         behavior: 'allow',
    //         downloadPath: path.resolve(`./declaration/form/${declarationId}`),
    //     });
    //     this.loggerService.log('Wait for getting XML button - Download XML');
    //     const xmlButtion = await frame?.$('input#btnXml');
    //     if (!xmlButtion) throw new NotFoundException('xml_button_not_found');
    //     this.loggerService.log('Wait for click XML button - Download XML');
    //     await xmlButtion?.click();
    //     this.loggerService.log('Wait for getting next button - Download XML');
    //     await frame?.waitForSelector('input#btnNext[value="Nộp tờ khai"]');
    //     await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.XML_DOWNLOAD_DELAY));
    //     this.loggerService.log('Wait for getting next button - Download XML');
    //     const btnNext = await frame?.$('input#btnNext[value="Nộp tờ khai"]');
    //     if (!btnNext) throw new NotFoundException('next_button_not_found');
    //     this.loggerService.log('Wait for click next button - Download XML');
    //     await btnNext?.click();
    //     this.loggerService.log('Wait for frame navigation - Download XML');
    //     await frame?.waitForNavigation();
    // }
    // private async submitFile(revenue: number, pageId: string, circular: string, uploadFilePath: string) {
    //     try {
    //         this.loggerService.log('Wait for getting current page - Submit file');
    //         const page = await this.getCurrentPage(pageId);
    //         this.loggerService.log('Wait for getting frame - Submit file');
    //         const frame = await this.getFrameContent(page);
    //         if (!frame) throw new NotFoundException('can_not_get_frame_content');
    //         if (revenue > 0) {
    //             this.loggerService.log('Wait for getting appendix - Submit file');
    //             const appendix = await frame?.$('select#maHS_1');
    //             this.loggerService.log('Wait for select appendix - Submit file');
    //             await appendix?.select(circular === String(CircularEnum.TT40) ? 'TNC12' : 'TNC08');
    //             this.loggerService.log('Wait for getting upload file - Submit file');
    //             const upFile = await frame?.$('input[type=file]#fileName_1');
    //             this.loggerService.log('Wait for upload file - Submit file');
    //             await upFile?.uploadFile(uploadFilePath);
    //         }
    //         this.loggerService.log('Wait for getting next button - Submit file');
    //         const nextButton = await frame?.$('input[value="Tiếp tục"]');
    //         if (!nextButton) throw new NotFoundException('next_button_not_found');
    //         this.loggerService.log('Wait for click next button - Submit file');
    //         await nextButton?.click();
    //         this.loggerService.log('Wait for frame navigation - Submit file');
    //         await frame?.waitForNavigation();
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException('can_not_submit_file');
    //     }
    // }
    // private async confirmSubmission(page: Page, frame: Frame | undefined) {
    //     let noOfCaptchaInput = 0;
    //     let resendOtpButton: ElementHandle<Element> | null | undefined;
    //     let captcha = '';
    //     do {
    //         this.loggerService.log('Wait for getting refresh captcha button - Confirm submission');
    //         await frame?.waitForSelector('img#safecode');
    //         this.loggerService.log('Wait for getting refresh captcha button - Confirm submission');
    //         const refreshCaptcha = await frame?.$('img.align-c[onclick="reloadVerifyCode();"]');
    //         this.loggerService.log('Wait for click refresh captcha button - Confirm submission');
    //         await refreshCaptcha?.click();
    //         this.loggerService.log('Getting captcha value - Confirm submission');
    //         const captchaValue: string | null | undefined = await this.getCaptchaValue(page, { keyImage: 'ImageServlet', useVision: true });
    //         if (captchaValue) {
    //             captcha = captchaValue.replaceAll(' ', '');
    //         } else {
    //             this.loggerService.warn('Captcha not found, refreshing captcha and retrying');
    //             noOfCaptchaInput++;
    //             continue;
    //         }
    //         this.loggerService.log('Filling captcha input - Confirm submission');
    //         await frame?.waitForSelector('input[type=text]#capcha');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CAPTCHA_INPUT_DELAY));
    //         this.loggerService.log('Wait for getting captcha input - Confirm submission');
    //         const inputCaptcha = await frame?.$('input[type=text]#capcha');
    //         this.loggerService.log('Wait for typing captcha input - Confirm submission');
    //         await inputCaptcha?.type(String(captcha));
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CAPTCHA_INPUT_DELAY));
    //         this.loggerService.log('Submitting captcha - Confirm submission');
    //         await frame?.waitForSelector('input[type=button]#submitCapc');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CAPTCHA_INPUT_DELAY));
    //         this.loggerService.log('Wait for getting continue action - Confirm submission');
    //         const continueAction = await frame?.$('input[type=button]#submitCapc');
    //         this.loggerService.log('Wait for click continue action - Confirm submission');
    //         await continueAction?.click();
    //         this.loggerService.log('Wait for frame navigation - Confirm submission');
    //         await frame?.waitForNavigation();
    //         this.loggerService.log('Checking for resend OTP button - Confirm submission');
    //         resendOtpButton = await frame?.$('input[value="Gửi lại OTP"]#guilaiOtp');
    //         noOfCaptchaInput++;
    //     } while (!resendOtpButton && noOfCaptchaInput < MAX_CAPTCHA_INPUT);
    // }
    // private async confirmOtp(pageId: string): Promise<boolean> {
    //     try {
    //         this.loggerService.log('Start confirmOtp');
    //         const page = await this.getCurrentPage(pageId);
    //         this.loggerService.log('Fetched iframe element for confirmOtp');
    //         const frame = await this.getFrameContent(page);
    //         if (!frame) throw new NotFoundException('can_not_get_frame_content');
    //         this.loggerService.log('Fetched content frame for confirmOtp');
    //         await frame?.waitForSelector('input#otp');
    //         this.loggerService.log('Waited for OTP input selector');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CAPTCHA_INPUT_DELAY));
    //         const inputOtp = await frame?.$('input#otp');
    //         this.loggerService.log('Fetched OTP input element');
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.CAPTCHA_INPUT_DELAY));
    //         const result = Boolean(inputOtp);
    //         this.loggerService.log(`OTP input element exists: ${result}`);
    //         return result;
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException('can_not_confirm_otp');
    //     }
    // }
    // private async getCurrentPage(pageId: string): Promise<Page> {
    //     try {
    //         const browser = await this.puppeteerService.getBrowserSession(pageId);
    //         const contexts = browser.browserContexts();
    //         const incognitoContext = contexts.find((c: BrowserContext) => c.isIncognito() === true);
    //         if (!incognitoContext) {
    //             const context: BrowserContext = await browser.createIncognitoBrowserContext();
    //             return context.newPage();
    //         }
    //         const pages: Page[] = await incognitoContext.pages();
    //         if (pages.length > 0) return pages[0];
    //         return incognitoContext.newPage();
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException('can_not_get_current_page');
    //     }
    // }
    // private async getFrameContent(page: Page): Promise<Frame | undefined> {
    //     try {
    //         this.loggerService.log('Wait for getting i frame - Get frame content');
    //         const iframeElement = await page.$('#iframeRenderSSO iframe');
    //         if (!iframeElement) throw new NotFoundException('i_frame_not_found');
    //         this.loggerService.log('Wait for getting frame - Get frame content');
    //         const frame = await iframeElement.contentFrame();
    //         return frame;
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException('can_not_get_frame_content');
    //     }
    // }
    // private async getCaptchaValue(
    //     page: Page,
    //     options: { keyImage: string; useBase64?: boolean; useVision?: boolean; typeImage?: string },
    // ): Promise<string | null | undefined> {
    //     const { keyImage, useBase64, useVision, typeImage } = options;
    //     try {
    //         let buffer: Buffer | undefined;
    //         if (useBase64) {
    //             const imageElement = await page.$(keyImage);
    //             if (imageElement) {
    //                 const src: string | undefined = await imageElement.evaluate((img) => {
    //                     if (img instanceof HTMLImageElement) {
    //                         return img.src;
    //                     }
    //                     return undefined;
    //                 });
    //                 if (src?.startsWith('data:image')) {
    //                     buffer = Buffer.from(src?.split(',')[1], 'base64');
    //                 }
    //             }
    //         } else {
    //             const finalResponse = await page
    //                 .waitForResponse((response: any) => {
    //                     if (response.url()?.includes(keyImage)) return response;
    //                     return null;
    //                 })
    //                 .catch(() => null);
    //             buffer = await finalResponse?.buffer();
    //         }
    //         if (!buffer) return null;
    //         // Detect image from base64
    //         if (useVision) {
    //             return this.visionService.detectImage(buffer);
    //         } else {
    //             return this.genAiService.analyzeImageWithGemini(buffer, typeImage ?? 'image/jpeg');
    //         }
    //     } catch (error) {
    //         return null;
    //     }
    // }
    // private async closeBrowser(pageId: string, page: Page): Promise<void> {
    //     try {
    //         const browser = await this.puppeteerService.getBrowserSession(pageId);
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FRAME_NAVIGATION_DELAY));
    //         await page.close();
    //         await new Promise((r) => setTimeout(r, SIMULATION_WAIT_TIME.FORM_INPUT_DELAY));
    //         await browser.close();
    //         await this.puppeteerService.closePageSession(pageId);
    //     } catch (error) {
    //         this.loggerService.error(error);
    //         throw new NotFoundException('can_not_close_browser');
    //     }
    // }
}
