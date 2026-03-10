/**
 * Service to handle communication with JTR (Jewelry Trade Resources) API
 * Used for fetching 360 images and videos for diamonds.
 */

const API_URL = "https://iems2.azurewebsites.net/api/SampleReport/GetReportDataList";

interface JtrMediaData {
  certificateNumber?: string;
  reportNo?: string;
  ReportNo?: string;
  JTRCertificateNo?: string;
  stillImageUrlPlain?: string;
  StillImageUrl?: string;
  jtr360Cdn?: string;
  Jtr360Cdn?: string;
  jtr360SmCdn?: string;
  Jtr360SmCdn?: string;
  JTRVision?: boolean;
}

interface MappedMediaData {
  StillImageUrl?: string;
  Jtr360Cdn?: string;
  Jtr360SmCdn?: string;
  JTRVision: boolean;
}

/**
 * Fetches media data (images/360) for a list of JTR Certificate Numbers.
 * @param certificateNumbers - Array of JTR Certificate Numbers
 * @returns Map of certNo -> mediaData
 */
export const fetchJtrMedia = async (
  certificateNumbers: string[]
): Promise<Record<string, MappedMediaData>> => {
  if (!certificateNumbers || certificateNumbers.length === 0) {
    return {};
  }

  try {
    // Filter out empty or null numbers
    const validNumbers = certificateNumbers.filter((n) => n);
    if (validNumbers.length === 0) return {};

    const requestBody = { reportNumbers: validNumbers };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('JTR API Error:', response.status, response.statusText);
      return {};
    }

    const data: JtrMediaData[] = await response.json();

    const mediaMap: Record<string, MappedMediaData> = {};
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const rawKey =
          item.certificateNumber ||
          item.reportNo ||
          item.ReportNo ||
          item.JTRCertificateNo;
        const key = rawKey ? String(rawKey).trim() : null;

        if (key) {
          const mappedItem: MappedMediaData = {
            StillImageUrl: item.stillImageUrlPlain || item.StillImageUrl,
            Jtr360Cdn: item.jtr360Cdn || item.Jtr360Cdn,
            Jtr360SmCdn: item.jtr360SmCdn || item.Jtr360SmCdn,
            JTRVision:
              item.JTRVision !== undefined
                ? item.JTRVision
                : !!item.jtr360SmCdn,
          };
          mediaMap[key] = mappedItem;
        }
      });
    }

    return mediaMap;
  } catch (error) {
    console.error('Error fetching JTR media:', error);
    return {};
  }
};
