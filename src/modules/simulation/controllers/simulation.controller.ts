import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('simulation')
@ApiTags('simulation')
export class SimulationControllerV2 {
    // constructor(
    //     private readonly s3Service: AwsS3Service,
    //     private readonly utilsService: UtilsService,
    //     private readonly exportService: ExportService,
    //     private readonly customerService: CustomerService,
    //     private readonly simualationServiceV2: SimulationServiceV2,
    // ) {}
    // @ApiOperation({ summary: 'Simulate tax v2' })
    // @Post('tax')
    // @Version('2')
    // @HttpCode(HttpStatus.OK)
    // @ApiConsumes('multipart/form-data')
    // @UseInterceptors(FileInterceptor('attachedDocument'))
    // @ApiResponse({
    //   status: HttpStatus.OK,
    //   description: 'Simulate tax v2',
    // })
    // public async simulateTaxSubmitDeclarationForm(@Body() request: SimulateTaxDto): Promise<SimulateTaxResponseDto> {
    //   const { customerId, revenue, taxPeriod } = request;
    //   const customer: CustomerEntity | null = await this.customerService.get(customerId);
    //   const pageId = `${customerId}_${customer?.businessType}_${Date.now()}`;
    //   // Check if customer is valid
    //   if (!customer || !customer.isActive) {
    //     return new SimulateTaxResponseDto({
    //       pageId,
    //       inputOtp: false,
    //       isSuccess: false,
    //       declarationId: '',
    //       errorMessage: 'customer_not_found',
    //     });
    //   }
    //   const { passwordTax, transactions } = customer;
    //   // Create new declaration
    //   const newDeclarationId: string = uuidv4();
    //   // Check if there are valid transactions
    //   if (revenue > 0) {
    //     const validTransactions: TransactionEntity[] | undefined = transactions?.filter(
    //       (transaction: TransactionEntity) => transaction.status !== String(TransactionStatusEnum.DECLARED_TAX),
    //     );
    //     if (!validTransactions?.length) {
    //       return new SimulateTaxResponseDto({
    //         pageId,
    //         inputOtp: false,
    //         isSuccess: false,
    //         declarationId: '',
    //         errorMessage: 'transaction_not_found',
    //       });
    //     }
    //     // Export accountant book
    //     const { from, to } = request;
    //     const buffer: Buffer = await this.exportService.export(customer, from, to);
    //     // Upload accountant book to S3
    //     const uploadPath = `customer/${customerId}/declaration/${newDeclarationId}/attachment/${newDeclarationId}.xlsx`;
    //     const uploadResult: { etag: string; versionId: string; key: string } = await this.s3Service.uploadFile(buffer, uploadPath);
    //     if (!uploadResult?.key) throw new BadRequestException('upload_failed');
    //     // Get uploaded accountant book from S3
    //     const downloadPath = `declaration/attachment/${newDeclarationId}.xlsx`;
    //     await this.s3Service.downloadFile(uploadResult.key, downloadPath);
    //   }
    //   // Decrypt password
    //   if (passwordTax) {
    //     customer.passwordTax = String(await this.utilsService.decryptPassword(passwordTax));
    //   }
    //   // Start simulation
    //   const cwd: string = process.cwd();
    //   const attachmentPath = `${cwd}/declaration/attachment/${newDeclarationId}.xlsx`;
    //   const simulationResult: SimulateTaxLoginFlowResponseDto = await this.simualationServiceV2.simulateTaxLoginFlow(
    //     customer,
    //     revenue,
    //     taxPeriod,
    //     attachmentPath,
    //     newDeclarationId,
    //     pageId,
    //   );
    //   // simulate fail => delete declaration form in local disk and delete attachment in local disk & in S3
    //   if (!simulationResult.isSuccess) {
    //     // Delete declaration form in local disk
    //     const tempFolderPath = `${cwd}/declaration/form/${newDeclarationId}`;
    //     this.utilsService.deleteFolder(tempFolderPath);
    //     if (revenue > 0) {
    //       // Delete declaration attachment in local disk
    //       const tempAttachmentPath = `${cwd}/declaration/attachment/${newDeclarationId}.xlsx`;
    //       this.utilsService.deleteFile(tempAttachmentPath);
    //       // Delete declaration attachment in S3
    //       const tempAttachmentS3Path = `customer/${customerId}/declaration/${newDeclarationId}/attachment/${newDeclarationId}.xlsx`;
    //       await this.s3Service.deleteFile([tempAttachmentS3Path]);
    //     }
    //     return new SimulateTaxResponseDto({
    //       pageId,
    //       inputOtp: false,
    //       isSuccess: false,
    //       declarationId: '',
    //     });
    //   }
    //   return new SimulateTaxResponseDto({
    //     pageId,
    //     isSuccess: true,
    //     inputOtp: true,
    //     declarationId: newDeclarationId,
    //   });
    // }
    // @ApiOperation({ summary: 'Simulate invoice v2' })
    // @Post('invoice')
    // @Version('2')
    // @HttpCode(HttpStatus.OK)
    // @ApiConsumes('multipart/form-data')
    // @UseInterceptors(FileInterceptor('attachedDocument'))
    // @ApiResponse({
    //   status: HttpStatus.OK,
    //   description: 'Simulate invoice v2',
    // })
    // public async simulateInvoiceSubmitDeclarationForm(@Body() request: SimulateInvoiceRequestDto): Promise<SimulateInvoiceResponseDto> {
    //   const { customerId } = request;
    //   const customer: CustomerEntity | null = await this.customerService.get(customerId);
    //   const pageId = `${customerId}_${customer?.businessType}_${Date.now()}`;
    //   if (!customer?.isActive) {
    //     return new SimulateInvoiceResponseDto({
    //       pageId,
    //       isSuccess: false,
    //       errorMessage: 'customer_not_found',
    //     });
    //   }
    //   if (customer?.passwordTax) {
    //     customer.passwordTax = String(await this.utilsService.decryptPassword(customer.passwordTax));
    //   }
    //   const simulationResult: SimulateTaxLoginFlowResponseDto = await this.simualationServiceV2.simulateInvoiceLoginFlow(customer, pageId);
    //   return new SimulateInvoiceResponseDto({
    //     pageId,
    //     isSuccess: true,
    //   });
    // }
}
