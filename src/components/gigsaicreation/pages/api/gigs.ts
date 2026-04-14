import type { NextApiRequest, NextApiResponse } from 'next';
import { GigData } from '../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const gigData: GigData = req.body;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = {
      success: true,
      message: 'Gig saved successfully',
      data: gigData
    };
    // Ensure we're sending a valid JSON response
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in API handler:', error);
    const errorResponse = { 
      success: false,
      message: 'Failed to save gig data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    return res.status(500).json(errorResponse);
  }
} 