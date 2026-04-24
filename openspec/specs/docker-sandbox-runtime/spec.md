## Purpose

Provide Docker-based sandbox isolation for agent sessions. Each session runs in an isolated Docker container with resource limits and workspace mapping.

## Requirements

### Requirement: Docker sandbox lifecycle management
The system SHALL provide Docker container lifecycle management for session isolation. Each session SHALL have exactly one associated container that starts when the session is created and stops when the session is destroyed.

#### Scenario: Create session starts container
- **WHEN** a session is created via `POST /api/v1/sessions`
- **THEN** the system SHALL create a Docker container named `codenano-sandbox-{sessionId}`
- **AND** the container SHALL mount the session's physical workspace directory to `/workspace`
- **AND** the container SHALL start with resource limits (0.5 CPU, 512MB RAM)
- **AND** the container SHALL run as nonprivileged user `agent`

#### Scenario: Delete session stops container
- **WHEN** a session is destroyed via `DELETE /api/v1/sessions/{sessionId}`
- **THEN** the system SHALL stop and remove the associated Docker container
- **AND** the physical workspace directory SHALL be cleaned up

#### Scenario: Container uses specified Docker image
- **WHEN** a container is started
- **THEN** it SHALL use the image specified in configuration (default: `codenano-sandbox`)
- **AND** the container's working directory SHALL be `/workspace`

#### Scenario: Resource limits are enforced
- **WHEN** a container starts
- **THEN** cgroups limits SHALL be applied: `--cpus=0.5 --memory=512m`
- **AND** the container SHALL NOT be able to exceed these limits

#### Scenario: Docker daemon unavailable
- **WHEN** Docker daemon is not accessible at container creation time
- **THEN** the system SHALL return HTTP 503 with error message
- **AND** the session SHALL NOT be created
