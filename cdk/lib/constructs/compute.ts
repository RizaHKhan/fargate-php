import { IVpc, PrivateSubnet, PublicSubnet, Vpc } from "aws-cdk-lib/aws-ec2";
import { Stack } from "aws-cdk-lib/core";

interface SubnetConfig {
  type: "public" | "private" | "private_with_egress";
  id: string;
  availabilityZone: string;
  cidrBlock: string;
  vpcId: string;
}

export function networking(stack: Stack): {
  vpc: (id?: string) => IVpc;
  subnet: (config: SubnetConfig) => PublicSubnet | PrivateSubnet;
} {
  // Example: const defaultVpc = vpc();
  const vpc = (id?: string): IVpc => {
    const vpcId = id ?? stack.node.tryGetContext("vpcId") ?? process.env.VPC_ID;

    return Vpc.fromLookup(stack, "Vpc", {
      vpcId,
    });
  };

  const subnet = ({
    type,
    id,
    availabilityZone,
    cidrBlock,
    vpcId,
  }: SubnetConfig): PublicSubnet | PrivateSubnet => {
    switch (type) {
      case "public": {
        const publicSubnet = new PublicSubnet(stack, id, {
          vpcId: vpcId,
          availabilityZone,
          cidrBlock,
          mapPublicIpOnLaunch: true,
        });

        return publicSubnet;
      }
      case "private":
      case "private_with_egress":
        return new PrivateSubnet(stack, id, {
          vpcId: vpcId,
          availabilityZone,
          cidrBlock,
          mapPublicIpOnLaunch: false,
        });
    }
  };

  return {
    vpc,
    subnet,
  };
}
