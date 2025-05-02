# ExecutiveService Enhancement Requirements

Based on the PRD requirements analysis, the following enhancements are needed for the ExecutiveService:

## 1. Policy Integration Enhancements
- [x] Update policy check to use proper PolicyCheckContext
- [x] Implement effectiveModel handling from policy result
- [x] Add recordOutcome call after execution
- [x] Pass proper auth context and operation types (using system user for now)

## 2. Token Management
- [x] Implement maxCumulativeTokens constraint
- [x] Add token usage tracking across retries
- [x] Integrate token tracking with policy recordOutcome

## 3. Streaming Support
- [ ] Add streamText and other streaming methods
- [ ] Implement stream-specific retry logic
- [ ] Handle stream setup vs. stream content errors differently

## 4. Producer Service Integration
- [x] Add direct integration with TextService, ImageService etc.
- [x] Create type-safe wrappers around generic execute method
- [x] Add producer-specific execution options

## Implementation Priority
1. Token Management (core constraint)
2. Policy Integration (security/control)
3. Producer Integration (type safety)
4. Streaming Support (enhanced functionality)
