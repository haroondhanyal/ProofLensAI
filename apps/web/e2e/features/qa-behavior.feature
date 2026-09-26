@bdd
Feature: ProofLens everyday behavior and design requirements
  BDD scenarios exercise the same user-facing behavior as the regular UI suite.
  Test data is synthetic and the sample workspace remains read-only.

  @bdd @sample-report
  Scenario Outline: A sample report clearly stays fictional and read only <case>
    Given I open sample workspace with theme "<theme>"
    When I choose the "<type>" sample report
    Then the "<type>" sample report is visibly labeled read only

    Examples:
      | case | type | theme |
      | BDD-SAMPLE-001 | URL | light |
      | BDD-SAMPLE-002 | MESSAGE | dark |
      | BDD-SAMPLE-003 | QR | slate |
      | BDD-SAMPLE-004 | URL | ocean |
      | BDD-SAMPLE-005 | MESSAGE | contrast |
      | BDD-SAMPLE-006 | QR | light |
      | BDD-SAMPLE-007 | URL | dark |
      | BDD-SAMPLE-008 | MESSAGE | slate |
      | BDD-SAMPLE-009 | QR | ocean |
      | BDD-SAMPLE-010 | URL | contrast |
      | BDD-SAMPLE-011 | MESSAGE | light |
      | BDD-SAMPLE-012 | QR | dark |
      | BDD-SAMPLE-013 | URL | slate |
      | BDD-SAMPLE-014 | MESSAGE | ocean |
      | BDD-SAMPLE-015 | QR | contrast |
      | BDD-SAMPLE-016 | URL | light |
      | BDD-SAMPLE-017 | MESSAGE | dark |
      | BDD-SAMPLE-018 | QR | slate |
      | BDD-SAMPLE-019 | URL | ocean |
      | BDD-SAMPLE-020 | MESSAGE | contrast |
      | BDD-SAMPLE-021 | QR | light |
      | BDD-SAMPLE-022 | URL | dark |
      | BDD-SAMPLE-023 | MESSAGE | slate |
      | BDD-SAMPLE-024 | QR | ocean |
      | BDD-SAMPLE-025 | URL | contrast |
      | BDD-SAMPLE-026 | MESSAGE | light |
      | BDD-SAMPLE-027 | QR | dark |
      | BDD-SAMPLE-028 | URL | slate |
      | BDD-SAMPLE-029 | MESSAGE | ocean |
      | BDD-SAMPLE-030 | QR | contrast |

  @bdd @negative
  Scenario Outline: Signup rejects malformed email before sending it <case>
    Given I open the ProofLens account creation form
    When I enter the malformed email "<email>"
    Then the browser marks the email as invalid

    Examples:
      | case | email |
      | BDD-NEG-EMAIL-001 | plain-address |
      | BDD-NEG-EMAIL-002 | missing-at.example.com |
      | BDD-NEG-EMAIL-003 | @example.com |
      | BDD-NEG-EMAIL-004 | qa-user@ |
      | BDD-NEG-EMAIL-005 | qa user@example.com |
      | BDD-NEG-EMAIL-006 | qa@@example.com |
      | BDD-NEG-EMAIL-007 | plain.qa-at-example |
      | BDD-NEG-EMAIL-008 | qa.example.com |
      | BDD-NEG-EMAIL-009 | qa-user.example.com |
      | BDD-NEG-EMAIL-010 | qa user@example.com |
      | BDD-NEG-EMAIL-011 | user@.example.com |
      | BDD-NEG-EMAIL-012 | user@example..com |
      | BDD-NEG-EMAIL-013 | user@@example.org |
      | BDD-NEG-EMAIL-014 | user example@example.org |
      | BDD-NEG-EMAIL-015 | user@example .org |
      | BDD-NEG-EMAIL-016 | qa@@example.org |
      | BDD-NEG-EMAIL-017 | user name@example.org |
      | BDD-NEG-EMAIL-018 | user@-example.org |
      | BDD-NEG-EMAIL-019 | user@example-.org |
      | BDD-NEG-EMAIL-020 | user@.org |
      | BDD-NEG-EMAIL-021 | user@org..com |
      | BDD-NEG-EMAIL-022 | user@@mail.example.org |
      | BDD-NEG-EMAIL-023 | user@mail example.org |
      | BDD-NEG-EMAIL-024 | user@exam\nple.org |
      | BDD-NEG-EMAIL-025 | qa-user-25-example.net |
      | BDD-NEG-EMAIL-026 | qa-user-26-example.net |
      | BDD-NEG-EMAIL-027 | qa-user-27-example.net |
      | BDD-NEG-EMAIL-028 | qa-user-28-example.net |
      | BDD-NEG-EMAIL-029 | qa@ |
      | BDD-NEG-EMAIL-030 | qa-user-30-example.net |

  @bdd @responsive
  Scenario Outline: Landing page fits common QA viewport and theme <case>
    Given I view ProofLens at <width> by <height> using theme "<theme>"
    Then the public page has no horizontal overflow and shows its main heading

    Examples:
      | case | width | height | theme |
      | BDD-VIEW-001 | 320 | 640 | light |
      | BDD-VIEW-002 | 360 | 740 | dark |
      | BDD-VIEW-003 | 375 | 812 | slate |
      | BDD-VIEW-004 | 390 | 844 | ocean |
      | BDD-VIEW-005 | 414 | 896 | contrast |
      | BDD-VIEW-006 | 600 | 900 | light |
      | BDD-VIEW-007 | 720 | 960 | dark |
      | BDD-VIEW-008 | 768 | 1024 | slate |
      | BDD-VIEW-009 | 900 | 900 | ocean |
      | BDD-VIEW-010 | 1024 | 768 | contrast |
      | BDD-VIEW-011 | 1080 | 800 | light |
      | BDD-VIEW-012 | 1180 | 820 | dark |
      | BDD-VIEW-013 | 1280 | 720 | slate |
      | BDD-VIEW-014 | 1366 | 768 | ocean |
      | BDD-VIEW-015 | 1440 | 900 | contrast |
      | BDD-VIEW-016 | 1536 | 960 | light |
      | BDD-VIEW-017 | 1600 | 900 | dark |
      | BDD-VIEW-018 | 1680 | 1050 | slate |
      | BDD-VIEW-019 | 1728 | 1117 | ocean |
      | BDD-VIEW-020 | 1920 | 1080 | contrast |
      | BDD-VIEW-021 | 320 | 740 | dark |
      | BDD-VIEW-022 | 360 | 812 | slate |
      | BDD-VIEW-023 | 375 | 844 | ocean |
      | BDD-VIEW-024 | 390 | 896 | contrast |
      | BDD-VIEW-025 | 414 | 932 | light |
      | BDD-VIEW-026 | 768 | 900 | dark |
      | BDD-VIEW-027 | 1024 | 900 | slate |
      | BDD-VIEW-028 | 1280 | 800 | ocean |
      | BDD-VIEW-029 | 1440 | 960 | contrast |
      | BDD-VIEW-030 | 1920 | 1200 | light |

  @bdd @navigation
  Scenario Outline: Sample workspace navigation exposes the correct section <case>
    Given I open sample workspace with theme "<theme>"
    When I open the "<section>" section
    Then I see the section heading "<heading>"

    Examples:
      | case | theme | section | heading |
      | BDD-NAV-001 | light | History | Scan history |
      | BDD-NAV-002 | dark | Help | Use ProofLens with care. |
      | BDD-NAV-003 | slate | Privacy | Know what happens to a check. |
      | BDD-NAV-004 | ocean | History | Scan history |
      | BDD-NAV-005 | contrast | Help | Use ProofLens with care. |
      | BDD-NAV-006 | light | Privacy | Know what happens to a check. |
      | BDD-NAV-007 | dark | History | Scan history |
      | BDD-NAV-008 | slate | Help | Use ProofLens with care. |
      | BDD-NAV-009 | ocean | Privacy | Know what happens to a check. |
      | BDD-NAV-010 | contrast | History | Scan history |
      | BDD-NAV-011 | light | Help | Use ProofLens with care. |
      | BDD-NAV-012 | dark | Privacy | Know what happens to a check. |
      | BDD-NAV-013 | slate | History | Scan history |
      | BDD-NAV-014 | ocean | Help | Use ProofLens with care. |
      | BDD-NAV-015 | contrast | Privacy | Know what happens to a check. |
      | BDD-NAV-016 | light | History | Scan history |
      | BDD-NAV-017 | dark | Help | Use ProofLens with care. |
      | BDD-NAV-018 | slate | Privacy | Know what happens to a check. |
      | BDD-NAV-019 | ocean | History | Scan history |
      | BDD-NAV-020 | contrast | Help | Use ProofLens with care. |
      | BDD-NAV-021 | light | Privacy | Know what happens to a check. |
      | BDD-NAV-022 | dark | History | Scan history |
      | BDD-NAV-023 | slate | Help | Use ProofLens with care. |
      | BDD-NAV-024 | ocean | Privacy | Know what happens to a check. |
      | BDD-NAV-025 | contrast | History | Scan history |
      | BDD-NAV-026 | light | Help | Use ProofLens with care. |
      | BDD-NAV-027 | dark | Privacy | Know what happens to a check. |
      | BDD-NAV-028 | slate | History | Scan history |
      | BDD-NAV-029 | ocean | Help | Use ProofLens with care. |
      | BDD-NAV-030 | contrast | Privacy | Know what happens to a check. |
