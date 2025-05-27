# NocturneAI Unit Tests

This directory contains unit tests for the NocturneAI agent framework capabilities.

## Test Structure

- `test_communication.py`: Tests for the `BasicCommunication` capability
- `test_expertise.py`: Tests for the `DomainExpertise` capability
- `test_collaboration.py`: Tests for the `TeamCoordination` and `ConsensusBuilding` capabilities

## Running Tests

You can run all tests using pytest:

```bash
# Run all unit tests
pytest -v tests/unit/

# Run specific test file
pytest -v tests/unit/test_communication.py
```

## Adding New Tests

When adding new tests:

1. Create a new test file in this directory if testing a new capability
2. Use pytest fixtures for setup and teardown
3. Use `@pytest.mark.asyncio` for async tests
4. Mock external dependencies

## Integration Tests

Integration tests that verify the complete workflow functionality are in the main test directory and examples directory.