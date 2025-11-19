import { type FrameWaitForFunctionOptions, type Page, type WaitForOptions, type WaitForSelectorOptions } from 'puppeteer';
import { SimulationActionType } from '../enums/simulation-action.enum';
import { SimulationService } from '../enums';

export interface SimulationActionOptionsMap {
    [SimulationActionType.GO_TO]: {
        url: string;
        gotoOptions?: Parameters<Page['goto']>[1];
    };
    [SimulationActionType.WAIT_FOR_SELECTOR]: {
        selector: string;
        waitOptions?: WaitForSelectorOptions;
        maxTimeoutInSeconds?: number;
        intervalInSeconds?: number;
        usePolling?: boolean;
    };
    [SimulationActionType.CLICK_BY_TEXT]: {
        selector: string;
        matchText: string;
        isExactMatch?: boolean;
        waitOptions?: WaitForSelectorOptions;
    };
    [SimulationActionType.WAIT_FOR_NAVIGATION]: {
        waitOptions?: WaitForOptions;
    };
    [SimulationActionType.WAIT_FOR_FUNCTION]: {
        fn: () => boolean;
        waitOptions?: FrameWaitForFunctionOptions;
    };
    [SimulationActionType.WAIT_FOR_TIME]: {
        durationInSeconds: number;
    };
    [SimulationActionType.FILL_INPUT]: {
        selector: string;
        value: string;
        delayInMs?: number;
        clearBefore?: boolean;
        waitOptions?: WaitForSelectorOptions;
    };
    [SimulationActionType.SELECT_OPTION]: {
        selector: string;
        optionValue?: string;
        optionLabel?: string;
        waitOptions?: WaitForSelectorOptions;
    };
}

export type SimulationAction<TType extends SimulationActionType = SimulationActionType> = {
    type: TType;
    options: SimulationActionOptionsMap[TType];
};

export type GoToActionRequest = SimulationAction<SimulationActionType.GO_TO>;
export type WaitForSelectorActionRequest = SimulationAction<SimulationActionType.WAIT_FOR_SELECTOR>;
export type ClickByTextActionRequest = SimulationAction<SimulationActionType.CLICK_BY_TEXT>;
export type WaitForNavigationActionRequest = SimulationAction<SimulationActionType.WAIT_FOR_NAVIGATION>;
export type WaitForFunctionActionRequest = SimulationAction<SimulationActionType.WAIT_FOR_FUNCTION>;
export type WaitForTimeActionRequest = SimulationAction<SimulationActionType.WAIT_FOR_TIME>;
export type FillInputActionRequest = SimulationAction<SimulationActionType.FILL_INPUT>;
export type SelectOptionActionRequest = SimulationAction<SimulationActionType.SELECT_OPTION>;

export type SimulationActionRequest =
    | GoToActionRequest
    | ClickByTextActionRequest
    | WaitForSelectorActionRequest
    | WaitForNavigationActionRequest
    | WaitForFunctionActionRequest
    | WaitForTimeActionRequest
    | FillInputActionRequest
    | SelectOptionActionRequest;

export interface SimulationActionResult {
    type: SimulationActionType;
    index: number;
    endedAt: string;
    isSuccess: boolean;
    startedAt: string;
    durationInMs: number;
    errorMessage?: string;
}

export interface SimulationExecutionSummary {
    actions: SimulationActionResult[];
    endedAt: string;
    startedAt: string;
    durationInMs: number;
    serviceExecution: SimulationService;
}

export interface SimulationExecuteRequest<TPayload = unknown> {
    serviceExecution: SimulationService;
    payload?: TPayload;
}

export interface ServiceExecutionInternalResult {
    isSuccess: boolean;
    actions: SimulationActionResult[];
}
