import type { FlagComponent } from "country-flag-icons/react/3x2";
import DE from "country-flag-icons/react/3x2/DE";
import IE from "country-flag-icons/react/3x2/IE";
import JP from "country-flag-icons/react/3x2/JP";
import SG from "country-flag-icons/react/3x2/SG";
import US from "country-flag-icons/react/3x2/US";

export interface Region {
  Flag: FlagComponent;
  label: string;
  value: string;
}

export const REGIONS: readonly Region[] = [
  { value: "us-east-1", label: "US East (N. Virginia)", Flag: US },
  { value: "us-west-2", label: "US West (Oregon)", Flag: US },
  { value: "eu-west-1", label: "Europe (Ireland)", Flag: IE },
  { value: "eu-central-1", label: "Europe (Frankfurt)", Flag: DE },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", Flag: SG },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", Flag: JP },
];

export function getRegion(value: string): Region | undefined {
  return REGIONS.find((r) => r.value === value);
}
