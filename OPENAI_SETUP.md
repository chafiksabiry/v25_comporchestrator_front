# OpenAI Integration Setup

## Overview
This application uses OpenAI's GPT-4 API to process and validate contact data from uploaded CSV/Excel files. The AI provides intelligent data validation, formatting, and error detection.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with the following content:

```env
VITE_OPENAI_API_KEY=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
```

### 2. Features
The OpenAI integration provides:

- **Email Validation**: Validates email format and structure
- **Phone Number Standardization**: Formats phone numbers consistently
- **Data Quality Detection**: Identifies missing or invalid data
- **Intelligent Mapping**: Maps various column names to standard fields
- **Detailed Error Reporting**: Provides specific error messages for each row
- **Data Enrichment**: Adds default values for missing fields

### 3. File Format Support
- CSV files (comma or semicolon separated)
- Excel files (.xlsx, .xls)

### 4. Expected Columns
The AI can process files with various column names, but expects:
- Email addresses
- Phone numbers
- Lead names
- Stage information
- Pipeline information
- Project tags

### 5. Processing Flow
1. File upload
2. Content extraction (CSV/Excel)
3. OpenAI API call with structured prompt
4. JSON response parsing
5. Data validation and enrichment
6. Display of results with error reporting

### 6. Error Handling
The system handles various error scenarios:
- Missing API key
- API rate limits
- Invalid file formats
- Network errors
- Malformed responses

### 7. Security
- API key is stored in environment variables
- No sensitive data is logged
- API calls are made directly from the frontend

## Usage
1. Navigate to the Upload Contacts page
2. Select a gig
3. Upload your CSV/Excel file
4. Wait for AI processing
5. Review validation results
6. Save valid contacts

## Troubleshooting
- Ensure the API key is correctly set in `.env`
- Check network connectivity
- Verify file format is supported
- Review console logs for detailed error messages 