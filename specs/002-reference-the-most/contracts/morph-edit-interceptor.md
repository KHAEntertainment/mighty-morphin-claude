# Contract: MorphEditInterceptor

## Description
This contract defines the interface for the `MorphEditInterceptor` class, which is responsible for routing intercepted Claude file edit requests through MorphLLM FastApply and applying the results directly to the filesystem.

## Methods

### `interceptAndApply(editRequest: EditRequest): Promise<EditResult>`

**Purpose**: Intercepts an `EditRequest` and attempts to apply it using MorphLLM FastApply.

**Parameters**:
- `editRequest`: `EditRequest` - An object conforming to the `EditRequest` data model, containing details about the requested file edit.

**Returns**:
- `Promise<EditResult>` - A promise that resolves to an `EditResult` object, indicating the success or failure of the operation and details of any modifications.

**Behavior**:
1. Receives an `EditRequest`.
2. Communicates with MorphLLM FastApply to process the `editRequest`.
3. Applies the changes returned by MorphLLM directly to the filesystem.
4. Returns an `EditResult` indicating the outcome.
5. If MorphLLM fails or returns an invalid result, the `EditResult` should reflect this failure, allowing for fallback mechanisms.

## Error Handling
- Should return an `EditResult` with `success: false` and an `error` message if MorphLLM communication fails or if applying changes to the filesystem encounters an error.

## Dependencies
- Depends on the MorphLLM FastApply service/API.
- Depends on filesystem write capabilities.
- Utilizes the `EditRequest` and `EditResult` data models.
