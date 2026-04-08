import { Section } from "@react-email/components";
import { logoBox, logoSection, logoText } from "./styles";

export function Logo() {
  return (
    <Section style={logoSection}>
      <table cellPadding="0" cellSpacing="0" role="presentation">
        <tr>
          <td style={logoBox}>B</td>
          <td style={logoText}>buckt</td>
        </tr>
      </table>
    </Section>
  );
}
