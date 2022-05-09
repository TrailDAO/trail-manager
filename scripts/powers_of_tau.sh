snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e=$2
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup $1.r1cs pot12_final.ptau $1_0000.zkey
snarkjs zkey contribute $1_0000.zkey $1_0001.zkey --name="1st Contributor Name" -v -e=$3
snarkjs zkey export verificationkey $1_0001.zkey verification_key.json



