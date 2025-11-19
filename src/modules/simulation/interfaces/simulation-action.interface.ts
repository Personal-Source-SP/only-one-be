import { type FrameWaitForFunctionOptions, type Page, type WaitForOptions, type WaitForSelectorOptions } from 'puppeteer';
import { SimulationActionType } from '../enums/simulation-action.enum';

interface SimulationActionBaseRequest<TType extends SimulationActionType> {
    page: Page;
    type: TType;
}

export interface GoToActionRequest extends SimulationActionBaseRequest<SimulationActionType.GO_TO> {
    url: string;
    options?: Parameters<Page['goto']>[1];
}

export interface WaitForSelectorActionRequest extends SimulationActionBaseRequest<SimulationActionType.WAIT_FOR_SELECTOR> {
    selector: string;
    options?: WaitForSelectorOptions;
}

export interface ClickByTextActionRequest extends SimulationActionBaseRequest<SimulationActionType.CLICK_BY_TEXT> {
    selector: string;
    matchText: string;
    waitOptions?: WaitForSelectorOptions;
    isExactMatch?: boolean;
}

export interface WaitForNavigationActionRequest extends SimulationActionBaseRequest<SimulationActionType.WAIT_FOR_NAVIGATION> {
    options?: WaitForOptions;
}

export interface WaitForFunctionActionRequest extends SimulationActionBaseRequest<SimulationActionType.WAIT_FOR_FUNCTION> {
    fn: () => boolean;
    options?: FrameWaitForFunctionOptions;
}

export interface WaitForTimeActionRequest extends SimulationActionBaseRequest<SimulationActionType.WAIT_FOR_TIME> {
    durationInSeconds: number;
}

export type SimulationActionRequest =
    | GoToActionRequest
    | ClickByTextActionRequest
    | WaitForSelectorActionRequest
    | WaitForNavigationActionRequest
    | WaitForFunctionActionRequest
    | WaitForTimeActionRequest;

export interface SimulationActionResult {
    index: number;
    type: SimulationActionType;
    isSuccess: boolean;
}
