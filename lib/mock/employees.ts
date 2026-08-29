/* --------------------------------------------------------------------------
 * Fallback org tree for the เลือกพนักงาน panel on pages that don't fetch the
 * real org structure yet (e.g. the employee detail page). The employee list
 * page passes the real tree built from the database.
 * ------------------------------------------------------------------------ */

export type OrgNode = {
  id: string;
  code: string;
  name: string;
  count?: number;
  /** Employee type shown as a pill on leaf nodes. */
  type?: string;
  children?: OrgNode[];
};

export const ORG_TREE: OrgNode[] = [
  {
    id: "svoa",
    code: "SVOA",
    name: "MIC ORGANIZE CO., LTD.",
    count: 2,
    children: [
      {
        id: "b01",
        code: "B01",
        name: "SVOA PUBLIC",
        count: 2,
        children: [
          {
            id: "d01",
            code: "D01",
            name: "Speed Computer",
            count: 2,
            children: [
              { id: "SVOAOO1", code: "SVOAOO1", name: "เทพพิทักษ์ แม่นยำ", type: "พนักงานรายเดือน" },
              { id: "SVOAOO2", code: "SVOAOO2", name: "นพดล ฟุ้งศรีสถิตย์กุล", type: "พนักงานรายเดือน" },
            ],
          },
        ],
      },
    ],
  },
];
