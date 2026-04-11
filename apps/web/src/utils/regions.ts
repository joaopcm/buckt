import type { FlagComponent } from "country-flag-icons/react/3x2";
import AU from "country-flag-icons/react/3x2/AU";
import BH from "country-flag-icons/react/3x2/BH";
import BR from "country-flag-icons/react/3x2/BR";
import CA from "country-flag-icons/react/3x2/CA";
import DE from "country-flag-icons/react/3x2/DE";
import FR from "country-flag-icons/react/3x2/FR";
import GB from "country-flag-icons/react/3x2/GB";
import IE from "country-flag-icons/react/3x2/IE";
import IN from "country-flag-icons/react/3x2/IN";
import JP from "country-flag-icons/react/3x2/JP";
import KR from "country-flag-icons/react/3x2/KR";
import SE from "country-flag-icons/react/3x2/SE";
import SG from "country-flag-icons/react/3x2/SG";
import US from "country-flag-icons/react/3x2/US";
import ZA from "country-flag-icons/react/3x2/ZA";

export interface Region {
  Flag: FlagComponent;
  label: string;
  value: string;
}

export const REGIONS: readonly Region[] = [
  { value: "us-east-1", label: "US East (N. Virginia)", Flag: US },
  { value: "us-east-2", label: "US East (Ohio)", Flag: US },
  { value: "us-west-1", label: "US West (N. California)", Flag: US },
  { value: "us-west-2", label: "US West (Oregon)", Flag: US },
  { value: "ca-central-1", label: "Canada (Central)", Flag: CA },
  { value: "eu-west-1", label: "Europe (Ireland)", Flag: IE },
  { value: "eu-west-2", label: "Europe (London)", Flag: GB },
  { value: "eu-west-3", label: "Europe (Paris)", Flag: FR },
  { value: "eu-central-1", label: "Europe (Frankfurt)", Flag: DE },
  { value: "eu-north-1", label: "Europe (Stockholm)", Flag: SE },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)", Flag: IN },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", Flag: SG },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)", Flag: AU },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", Flag: JP },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)", Flag: KR },
  { value: "sa-east-1", label: "South America (Sao Paulo)", Flag: BR },
  { value: "me-south-1", label: "Middle East (Bahrain)", Flag: BH },
  { value: "af-south-1", label: "Africa (Cape Town)", Flag: ZA },
];

export function getRegion(value: string): Region | undefined {
  return REGIONS.find((r) => r.value === value);
}
