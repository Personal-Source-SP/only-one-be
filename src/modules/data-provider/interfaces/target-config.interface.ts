export interface ITargetConfig {
    functionGenerator: string; // Function generator
    mainContentSelector: string; // Main selector for getting main content
    isGetParentElement: boolean; // Get parent element of main content
}

export interface IGenerateExtractDataFunction {
    htmlContent: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
    additionalHtmlContent?: string[]; // Optional array of additional HTML content examples
}

export interface IRunFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}
