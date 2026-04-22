## Purpose

<!-- TBD -->

## Requirements

### Requirement: Cross-browser UUID generation
The system SHALL provide a UUID generation function that works in all supported browsers without throwing errors.

#### Scenario: Generate UUID in modern browser
- **WHEN** code calls `uuid()` in a browser that supports `crypto.getRandomValues()`
- **THEN** a valid v4 UUID string is returned

#### Scenario: Generate UUID in older browser
- **WHEN** code calls `uuid()` in a browser that does NOT support `crypto.randomUUID()`
- **THEN** a valid v4 UUID string is returned without throwing an error

#### Scenario: UUID format is valid v4
- **WHEN** `uuid()` is called
- **THEN** the returned string matches the v4 UUID format (8-4-4-4-12 hex digits)
