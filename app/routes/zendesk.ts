import express from "express";
import dns from "dns";
import axios from "axios";

const router = express.Router();

const getBaseDomain = (domain: string) => {
  return domain.split(".")[0];
};

const getCname = async (domain: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    dns.resolveCname(domain, (err, addresses) => {
      if (err) reject(err);

      resolve(addresses);
    });
  });
};

const ZENDESK_DOMAIN = ".zendesk.com";

interface Pages {
  domain: string;
  loginPage: string | null;
  supportPage: string | null;
}

router.post("/pages", async (req: Request, res: Response) => {
  // Can sanitise and validate inputs if we want

  const domains: string[] = req.body.domains;

  const list = await Promise.all(
    domains.map(async (domain) => {
      const pages: Pages = {
        domain,
        loginPage: null,
        supportPage: null,
      };
      const baseDomain = getBaseDomain(domain);

      // get login page
      try {
        const loginPageUrl = `http://${baseDomain}.zendisk.com`;
        const res = await axios.get(loginPageUrl);
        if (res.status === 200) {
          pages.loginPage = loginPageUrl;
        }
      } catch (err) {
        // log and handle error
      }

      // get help page
      try {
        const helpPageUrl = `help.${domain}`;
        const cnames = await getCname(helpPageUrl);
        const zendeskHostPage = cnames.find((cname) =>
          cname.endsWith(ZENDESK_DOMAIN)
        );
        if (!!zendeskHostPage) {
          pages.supportPage = zendeskHostPage;
        }
      } catch (err) {
        // log and handle error
      }

      if (pages.supportPage) return pages;

      // get support page
      try {
        const supportPageUrl = `support.${domain}`;
        const cnames = await getCname(supportPageUrl);
        const zendeskHostPage = cnames.find((cname) =>
          cname.endsWith(ZENDESK_DOMAIN)
        );
        if (!!zendeskHostPage) {
          pages.supportPage = zendeskHostPage;
        }
      } catch (err) {
        // log and handle error
      }

      return pages;
    })
  );

  res.json(list);
});

export default router;
