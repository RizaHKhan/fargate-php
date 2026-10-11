# Fargate

## OIDC Role ARN

Step 1: Register GitHub as an OIDC provider (once per account)

```bash

aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

Results:

```bash
{
    "OpenIDConnectProviderArn": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
}
```

Step 2: Create the role with a trust policy scoped to your repo
Save this as trust-policy.json — it restricts the role to only your repo's workflows:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:RizaHKhan/fargate-php:*"
        }
      }
    }
  ]
}
```

Create the role:

```bash
aws iam create-role \
--role-name github-fargate-php-deploy \
--assume-role-policy-document file://trust-policy.json
```

The command's output includes "Arn": "arn:aws:iam::<ACCOUNT_ID>:role/github-fargate-php-deploy" — that's your AWS_ROLE_ARN. (You can also always find it later in IAM → Roles → that role → copy ARN at the top.)

Step 3: Give the role permission to deploy CDK
Since your stack uses cdk deploy + Docker assets, the clean least-privilege approach is to let it assume the CDK bootstrap roles rather than granting broad access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cdk-hnb659fds-*"
    }
  ]
}
```

Attach it:

```bash
aws iam put-role-policy \
--role-name github-fargate-php-deploy \
--policy-name cdk-assume \
--policy-document file://cdk-permissions.json
```

This works because cdk bootstrap already created the cdk-hnb659fds-deploy-role-_, ...-file-publishing-role-_, and ...-image-publishing-role-* roles that actually do the heavy lifting — your GitHub role just needs to assume them.

Quick-and-dirty alternative: if you'd rather not deal with scoping right now, attach AdministratorAccess to the role instead (aws iam attach-role-policy --role-name github-fargate-php-deploy --policy-arn arn:aws:iam::aws:policy/AdministratorAccess). Easier, but over-privileged — fine for a personal/sandbox account, not for anything shared.

What to paste into the secrets page you're on

```
AWS_ROLE_ARN = arn:aws:iam::ACCOUNT_ID:role/github-fargate-php-deploy
```

Replace <ACCOUNT_ID> with your 12-digit AWS account number everywhere above (find it via aws sts get-caller-identity or the top-right of the AWS console).
